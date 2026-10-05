import { step } from './core.ts';
import { config } from './config.ts';
import { createScene } from './render.ts';
import {
  comboHit,
  createCombo,
  createEnemy,
  createGeneral,
  getHitStop,
  startSwing,
  stepEnemy,
  stepSwing,
  tickHitStop,
  type Combo,
  type Enemy,
  type General,
} from './combat.ts';

const params = new URLSearchParams(location.search);

interface Probe2Result {
  enemyHp: number;
  enemyState: string;
  generalHp: number;
  combo: number;
  hitStop: number;
  cfg: unknown;
}

function runProbe2(): void {
  // 決定性時間軸(issue #1,orchestrator 裁定):t=0 敵兵 (0,-2)、將軍朝 -z;
  // t=0.05 第 1 段;t=0.4 第 2 段(第 1 段後搖中,擊殺);gameT ≥ 0.8 回報。
  // hitStop 回報 = 期間觸發的最大值(擊殺應為 0.05)。
  const g = createGeneral(0, 0);
  g.facing = Math.PI; // 朝 -z
  const enemy: Enemy = createEnemy(1, 0, -2);
  const enemies = [enemy];
  const combo: Combo = createCombo();
  const dt = 1 / 60;
  let t = 0;
  let gameT = 0;
  let queued = 0;
  let maxHitStop = 0;
  while (gameT < 0.8) {
    if (getHitStop() > 0) {
      tickHitStop(dt);
      maxHitStop = Math.max(maxHitStop, getHitStop() + dt);
      continue;
    }
    if (t >= 0.05 && queued < 1) {
      startSwing(g, 1);
      queued = 1;
    }
    if (t >= 0.4 && queued < 2) {
      startSwing(g, 2);
      queued = 2;
    }
    const ev = stepSwing(g, dt, enemies);
    for (const h of ev) comboHit(combo, gameT);
    stepEnemy(enemy, dt, g, enemies);
    maxHitStop = Math.max(maxHitStop, getHitStop());
    gameT += dt;
    t += dt;
  }
  const out: Probe2Result = {
    enemyHp: enemy.hp,
    enemyState: enemy.state,
    generalHp: g.hp,
    combo: combo.count,
    hitStop: maxHitStop,
    cfg: config,
  };
  (window as unknown as { __probe: Probe2Result }).__probe = out;
  const el = document.getElementById('probe');
  if (el) {
    el.hidden = false;
    el.textContent = JSON.stringify(out, null, 2);
  }
  document.getElementById('hud')?.remove();
}

if (params.get('probe') === '2') {
  runProbe2();
} else if (params.get('probe') === '1') {
  const g = { x: 0, z: 0, facing: 0, time: 0 };
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) {
    step(g, dt, { forward: true, back: false, left: false, right: false });
  }
  const out = {
    start: [0, 0],
    end: [g.x, g.z],
    dist: Math.hypot(g.x, g.z),
    cfg: config,
  };
  (window as unknown as { __probe: unknown }).__probe = out;
  const el = document.getElementById('probe');
  if (el) {
    el.hidden = false;
    el.textContent = JSON.stringify(out, null, 2);
  }
  document.getElementById('hud')?.remove();
} else {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const view = createScene(canvas);
  const g: General = createGeneral(0, 0);
  const enemy: Enemy = createEnemy(1, 0, -4);
  const enemies: Enemy[] = [enemy];
  const combo: Combo = createCombo();
  const comboEl = document.getElementById('combo');
  const hudEl = document.getElementById('hud');

  const keys: Record<string, boolean> = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyJ') pressAttack();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  function pressAttack(): void {
    const n: 1 | 2 | 3 = g.swing ? (((g.swing.n % 3) + 1) as 1 | 2 | 3) : 1;
    startSwing(g, n);
  }
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) pressAttack();
  });

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  const DT = 1 / 60;
  let last = performance.now();
  let acc = 0;

  function frame(now: number): void {
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (acc >= DT) {
      if (getHitStop() > 0) {
        tickHitStop(DT);
      } else {
        step(g, DT, {
          forward: !!(keys.KeyW || keys.ArrowUp),
          back: !!(keys.KeyS || keys.ArrowDown),
          left: !!(keys.KeyA || keys.ArrowLeft),
          right: !!(keys.KeyD || keys.ArrowRight),
        });
        const ev = stepSwing(g, DT, enemies);
        for (const h of ev) comboHit(combo, g.time);
        for (const e of enemies) stepEnemy(e, DT, g, enemies);
      }
      acc -= DT;
    }
    g.facing = view.aimAt(mouse.x, mouse.y, g.x, g.z);
    view.place(g.x, g.z, g.facing, getHitStop() > 0);
    view.setEnemy(enemy);
    if (comboEl) {
      comboEl.textContent = combo.count > 1 ? `COMBO ×${combo.count}` : '';
    }
    if (hudEl) hudEl.textContent = `M1 · WASD 移動 · 滑鼠指向 · 左鍵/J 普攻(三段) · HP ${Math.max(0, g.hp)}`;
    view.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
