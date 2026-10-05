import { section, check, ok, near, eq } from './harness.js';

// SPEC 抄自 DESIGN.md v0.3:§2.1 speed 6 m/s(起始值);§2.5 M0 邊界 = 正方形半邊 20 m。
const SPEC = { speed: 6, bounds: 20 };

// 無頭探針:遊戲頁 ?probe=1 跑 1 秒(60 step)前進輸入並回報數字。
const probe = await new Promise((resolve) => {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:200px';
  f.src = '../public/index.html?probe=1';
  f.addEventListener('load', () =>
    setTimeout(() => resolve(f.contentWindow ? f.contentWindow.__probe : null), 400)
  );
  document.body.appendChild(f);
});

section('0 · SPEC 常數對照(DESIGN.md §2.1 / §2.5)');
check('probe 有回應', () =>
  ok(probe && typeof probe.dist === 'number', 'probe=' + JSON.stringify(probe && probe.cfg))
);
check('speed = 6 m/s', () => eq(probe && probe.cfg.speed, SPEC.speed, 'speed'));
check('bounds = 20 m', () => eq(probe && probe.cfg.bounds, SPEC.bounds, 'bounds'));

section('1 · 產品動詞:玩家會動');
check('1 秒前進移動約 6 m', () =>
  probe ? near(probe.dist, SPEC.speed, 0.15, '移動距離') : 'TODO: probe 未載入'
);
check('方向正確(前進 = -z)', () =>
  probe
    ? ok(probe.end[1] < -SPEC.speed * 0.9, 'end=' + JSON.stringify(probe.end))
    : 'TODO: probe 未載入'
);
check('終點仍在界內', () =>
  probe
    ? ok(
        Math.abs(probe.end[0]) <= SPEC.bounds && Math.abs(probe.end[1]) <= SPEC.bounds,
        'end=' + JSON.stringify(probe.end) + ', bounds=' + SPEC.bounds
      )
    : 'TODO: probe 未載入'
);

// ── M1(DESIGN.md v0.4:§3.1 普攻 15 / 硬直 0.3 / hit-stop 0.05;§2.3 敵兵 HP30 / 傷 5 / speed 3.5;§3.2 combo 0.8)──
// ?probe=2 固定時間軸(決定性,issue #1 + orchestrator 裁定):t=0 假人在 (0,-2)、將軍朝 -z;
// t=0.05 第 1 段;t=0.4 第 2 段(第 1 段後搖中)→ 第 2 段有效幀擊殺。
// gameT ≥ 0.8 時回報 __probe = { enemyHp, enemyState, generalHp, combo, hitStop, cfg: 完整 config }。
// 算據:第 1 段有效幀 ~0.25 命中(15);第 2 段 windup 0.2 後有效幀 ~0.6 命中(15)擊殺;
// 假人 0.5s Spawn + 硬直 0.3s,被擊殺(0.6s)時尚未進攻擊範圍(1.5 m),故 generalHp 必為 100;
// combo:兩命中間隔 ~0.34s < 0.8s 視窗 → 2;hitStop = 擊殺觸發的 0.05s 凍結。

section('2 · M1 SPEC 常數對照(DESIGN.md v0.4)');
check('attack.damage = 15', () => {
  const a = probe && probe.cfg && probe.cfg.attack;
  return a ? eq(a.damage, 15, '普攻傷害') : 'TODO: probe.cfg 缺 attack 段';
});
check('enemy.hp = 30 / damage = 5 / speed = 3.5', () => {
  const e = probe && probe.cfg && probe.cfg.enemy;
  if (!e) return 'TODO: probe.cfg 缺 enemy 段';
  const a = eq(e.hp, 30, '敵兵 HP');
  if (a !== true) return a;
  const b = eq(e.damage, 5, '敵兵傷害');
  if (b !== true) return b;
  const c = eq(e.speed, 3.5, '敵兵 speed(起始值)');
  if (c !== true) return c;
  return { pass: true, msg: `hp=${e.hp} damage=${e.damage} speed=${e.speed}` };
});
check('stagger = 0.3 / hitStop = 0.05 / comboWindow = 0.8', () => {
  const c = probe && probe.cfg;
  if (!c || c.stagger == null) return 'TODO: probe.cfg 缺 M1 段(stagger/hitStop/comboWindow)';
  const a = eq(c.stagger, 0.3, '硬直');
  if (a !== true) return a;
  const b = eq(c.hitStop, 0.05, 'hit-stop');
  if (b !== true) return b;
  const d = eq(c.comboWindow, 0.8, 'combo 視窗');
  if (d !== true) return d;
  return { pass: true, msg: `stagger=${c.stagger} hitStop=${c.hitStop} comboWindow=${c.comboWindow}` };
});

section('3 · M1 產品動詞:砍得出去、假人會死');
const probe2 = await new Promise((resolve) => {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:200px';
  f.src = '../public/index.html?probe=2';
  f.addEventListener('load', () =>
    setTimeout(() => resolve(f.contentWindow ? f.contentWindow.__probe : null), 1200)
  );
  document.body.appendChild(f);
});
check('假人兩下普攻(15)死', () =>
  probe2
    ? probe2.enemyHp === 0
      ? { pass: true, msg: `hp=0 state=${probe2.enemyState}` }
      : `hp=${probe2.enemyHp} state=${probe2.enemyState}`
    : 'TODO: probe=2 未實作'
);
check('combo 計數 = 2', () =>
  probe2 ? (probe2.combo === 2 ? { pass: true, msg: 'combo=2' } : `combo=${probe2.combo}`) : 'TODO: probe=2 未實作'
);
check('將軍 hp = 100(假人 0.8s 內來不及出手)', () =>
  probe2 ? (probe2.generalHp === 100 ? { pass: true, msg: 'hp=100' } : `hp=${probe2.generalHp}`) : 'TODO: probe=2 未實作'
);
check('擊殺時 hit-stop = 0.05', () =>
  probe2
    ? Math.abs(probe2.hitStop - 0.05) < 1e-9
      ? { pass: true, msg: 'hitStop=0.05' }
      : `hitStop=${probe2.hitStop}`
    : 'TODO: probe=2 未實作'
);

// ── M1.5 觸控(issue #2,owner 拍板自動瞄準):deadzone 0.3 / autoAimRange 12 m ──
// ?probe=3 決定性時間軸:A) 假人 (0,-20)(超射程),搖桿 full forward 1s → 移動 ≈6 m;
// B) 重置,假人 (0,-2),t=0.05/0.4 攻擊鈕×2(autoAim 每幀覆寫朝向)→ 擊殺、combo 2、hitStop 0.05。
// 無 autoAim 時將軍保持 facing 0(+z)→ 朝 +z 砍 → 空砍 → 擊殺檢查紅。

section('4 · M1.5 SPEC 常數對照(issue #2)');
const probe3 = await new Promise((resolve) => {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:200px';
  f.src = '../public/index.html?probe=3';
  f.addEventListener('load', () =>
    setTimeout(() => resolve(f.contentWindow ? f.contentWindow.__probe : null), 1200)
  );
  document.body.appendChild(f);
});
check('touch.deadzone = 0.3 / autoAimRange = 12', () => {
  const tc = probe3 && probe3.cfg && probe3.cfg.touch;
  if (!tc) return 'TODO: probe=3 未實作(cfg.touch 缺)';
  const a = eq(tc.deadzone, 0.3, '搖桿死區');
  if (a !== true) return a;
  const b = eq(tc.autoAimRange, 12, '自動瞄準射程');
  if (b !== true) return b;
  return { pass: true, msg: `deadzone=${tc.deadzone} autoAimRange=${tc.autoAimRange}` };
});

section('5 · M1.5 產品動詞:搖桿會走、自動瞄準會轉頭');
check('搖桿 full forward 1s 移動約 6 m', () =>
  probe3 ? near(probe3.moved, 6, 0.15, '移動距離') : 'TODO: probe=3 未實作'
);
check('自動瞄準:攻擊鈕兩下砍死 (0,-2) 假人', () =>
  probe3
    ? probe3.enemyHp === 0
      ? { pass: true, msg: `hp=0 state=${probe3.enemyState}` }
      : `hp=${probe3.enemyHp} state=${probe3.enemyState}`
    : 'TODO: probe=3 未實作'
);
check('combo = 2 / hitStop = 0.05 / 將軍 hp = 100', () => {
  if (!probe3) return 'TODO: probe=3 未實作';
  const parts = [
    probe3.combo === 2 ? 'combo=2' : `combo=${probe3.combo}`,
    Math.abs(probe3.hitStop - 0.05) < 1e-9 ? 'hitStop=0.05' : `hitStop=${probe3.hitStop}`,
    probe3.generalHp === 100 ? 'hp=100' : `hp=${probe3.generalHp}`,
  ];
  const pass = probe3.combo === 2 && Math.abs(probe3.hitStop - 0.05) < 1e-9 && probe3.generalHp === 100;
  return { pass, msg: parts.join(' ') };
});
