// M1 node guard:combat.ts 的純邏輯(Node 24 type stripping,import 帶 .ts)。
// SPEC 抄自 DESIGN.md v0.4:§2.1 將軍 HP 100 · §2.3 敵兵 HP 30 / 傷害 5 / speed 3.5(起始值)
// §3.1 普攻 15 / 硬直 0.3s / hit-stop 0.05s · §3.2 combo 視窗 0.8s
import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/game/config.ts';

const SPEC = {
  hit: 15,          // 普攻傷害(DESIGN.md §3.1)
  enemyHp: 30,      // 敵兵 HP(§2.3)
  enemyDmg: 5,      // 敵兵傷害(§2.3)
  enemySpeed: 3.5,  // 敵兵 speed(§2.3,orchestrator 起始值)
  stagger: 0.3,     // 硬直(§3.1)
  hitStop: 0.05,    // hit-stop(§3.1)
  comboWindow: 0.8, // combo 視窗(§3.2)
};

let combat;
try {
  combat = await import('../src/game/combat.ts');
} catch {
  combat = null;
}
const todo = (t, m) => t.skip(`TODO: ${m}`);

test('group 0 · M1 SPEC 常數對照(DESIGN.md v0.4)', (t) => {
  if (!config.attack) return todo(t, 'config.ts M1 段未實作');
  assert.equal(config.attack.damage, SPEC.hit, '普攻傷害 15');
  assert.equal(config.enemy.hp, SPEC.enemyHp, '敵兵 HP 30');
  assert.equal(config.enemy.damage, SPEC.enemyDmg, '敵兵傷害 5');
  assert.equal(config.enemy.speed, SPEC.enemySpeed, '敵兵 speed 3.5(起始值)');
  assert.equal(config.stagger, SPEC.stagger, '硬直 0.3');
  assert.equal(config.hitStop, SPEC.hitStop, 'hit-stop 0.05');
  assert.equal(config.comboWindow, SPEC.comboWindow, 'combo 視窗 0.8');
});

test('假人 HP30 恰好兩下普攻(15)死', (t) => {
  if (!combat) return todo(t, 'src/game/combat.ts 未實作');
  const e = combat.createEnemy(1, 0, 5);
  assert.equal(e.hp, SPEC.enemyHp);
  assert.equal(combat.hitEnemy(e, SPEC.hit), 'stagger');
  assert.equal(e.hp, 15);
  assert.equal(e.state, 'Stagger');
  assert.equal(combat.hitEnemy(e, SPEC.hit), 'die');
  assert.equal(e.hp, 0);
  assert.equal(e.state, 'Die');
});

test('硬直 0.3s:硬直中可再被擊(供連段)', (t) => {
  if (!combat) return todo(t, 'src/game/combat.ts 未實作');
  const g = { x: 0, z: 0, hp: 100 };
  const e = combat.createEnemy(1, 0, 5);
  combat.hitEnemy(e, SPEC.hit);
  const dt = 1 / 60;
  for (let i = 0; i < 12; i++) combat.stepEnemy(e, dt, g, [e]); // 0.2s < 0.3s
  assert.equal(e.state, 'Stagger');
  assert.equal(combat.hitEnemy(e, SPEC.hit), 'die', '硬直中可再被擊');
});

test('combo:0.8s 內連續命中累加,過期歸 1', (t) => {
  if (!combat) return todo(t, 'src/game/combat.ts 未實作');
  const c = combat.createCombo();
  assert.equal(combat.comboHit(c, 0), 1);
  assert.equal(combat.comboHit(c, 0.5), 2, '0.5s 在視窗內應累加');
  assert.equal(combat.comboHit(c, 0.5 + SPEC.comboWindow + 0.01), 1, '視窗過期應歸 1');
});

test('鏈接:1→2→3,鏈結束回 1', (t) => {
  if (!combat) return todo(t, 'src/game/combat.ts 未實作');
  const g = combat.createGeneral(0, 0);
  assert.equal(combat.startSwing(g, 1), 1);
  stepToRecover(g);
  assert.equal(combat.startSwing(g, 2), 2, '第 1 段後搖中按鍵應接第 2 段');
  stepToRecover(g);
  assert.equal(combat.startSwing(g, 3), 3, '第 2 段後搖中按鍵應接第 3 段');
  stepToRecover(g);
  assert.equal(combat.startSwing(g, 2), 1, '鏈結束(第 3 段後)回第 1 段');
});

test('敵兵 AI:追將軍、近距離造成 5 傷', (t) => {
  if (!combat) return todo(t, 'src/game/combat.ts 未實作');
  const g = { x: 0, z: 0, hp: 100 };
  const e = combat.createEnemy(1, 0, 10);
  const dt = 1 / 60;
  let elapsed = 0;
  while (elapsed < 20 && g.hp === 100) {
    combat.stepEnemy(e, dt, g, [e]);
    elapsed += dt;
  }
  assert.equal(g.hp, 95, `應被敵兵打 5,實際 ${100 - g.hp}`);
  assert.ok(elapsed < 20, `應在 20s 內攻擊,實際 ${elapsed.toFixed(1)}s`);
});

test('hit-stop:擊殺時全場凍 0.05s', (t) => {
  if (!combat) return todo(t, 'src/game/combat.ts 未實作');
  combat.resetHitStop();
  const e = combat.createEnemy(1, 0, 2);
  assert.equal(combat.hitEnemy(e, 60), 'die', '一擊 60 應擊殺 HP30');
  assert.ok(
    Math.abs(combat.getHitStop() - SPEC.hitStop) < 1e-9,
    `期望 ${SPEC.hitStop},實際 ${combat.getHitStop()}`
  );
});

function stepToRecover(g) {
  const dt = 1 / 60;
  for (let i = 0; i < 900 && g.swing; i++) {
    combat.stepSwing(g, dt);
    if (g.swing && g.swing.phase === 'recover') break;
  }
}
