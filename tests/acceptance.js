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
