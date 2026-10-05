import { step } from './core.ts';
import { config } from './config.ts';
import { createScene } from './render.ts';
import {
  autoAim,
  comboHit,
  createCombo,
  createEnemy,
  createGeneral,
  getHitStop,
  joystickToInput,
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

interface Probe3Result {
  moved: number;
  enemyHp: number;
  enemyState: string;
  generalHp: number;
  combo: number;
  hitStop: number;
  cfg: unknown;
}

function runProbe3(): void {
  // 決定性時間軸(issue #2):
  // A) 假人 (0,-20)(超出 autoAimRange),搖桿 full forward 1s → 玩家移動 ≈ 6 m。
  // B) 重置;假人 (0,-2);t=0.05/0.4 攻擊鈕×2(autoAim 每幀覆寫朝向)→ 擊殺、combo 2、hitStop 0.05。
  const dt = 1 / 60;
  let moved = 0;
  {
    const p = createGeneral(0, 0);
    const far: Enemy = createEnemy(1, 0, -20);
    for (let i = 0; i < 60; i++) {
      step(p, dt, joystickToInput(0, 1));
      stepEnemy(far, dt, p, [far]);
    }
    moved = Math.hypot(p.x, p.z);
  }
  const g = createGeneral(0, 0);
  const enemy: Enemy = createEnemy(1, 0, -2);
  const enemies = [enemy];
  const combo: Combo = createCombo();
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
    const aa = autoAim(g.x, g.z, enemies);
    if (aa !== null) g.facing = aa;
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
  const out: Probe3Result = {
    moved,
    enemyHp: enemy.hp,
    enemyState: enemy.state,
    generalHp: g.hp,
    combo: combo.count,
    hitStop: maxHitStop,
    cfg: config,
  };
  (window as unknown as { __probe: Probe3Result }).__probe = out;
  const el = document.getElementById('probe');
  if (el) {
    el.hidden = false;
    el.textContent = JSON.stringify(out, null, 2);
  }
  document.getElementById('hud')?.remove();
}

if (params.get('probe') === '3') {
  runProbe3();
} else if (params.get('probe') === '2') {
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
  const touchMode =
    params.get('touch') === '1' ||
    matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window;
  window.addEventListener('mousedown', (e) => {
    if (!touchMode && e.button === 0) pressAttack();
  });

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // M1.5 虛擬按鍵(issue #2):左下固定搖桿 + 右下攻擊鈕;朝向 = autoAim。
  const joyState = { id: -1, cx: 0, cy: 0, vx: 0, vy: 0 };
  const JOY_R = 30; // 搖桿 knob 行程半徑(px),對應 index.html #joy 112px / #knob 52px
  const joyEl = document.getElementById('joy');
  const knobEl = document.getElementById('knob');

  function setJoy(x: number, y: number): void {
    let dx = x - joyState.cx;
    let dy = y - joyState.cy;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) {
      dx *= JOY_R / d;
      dy *= JOY_R / d;
    }
    joyState.vx = dx / JOY_R;
    joyState.vy = dy / JOY_R;
    if (knobEl) knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  if (touchMode) {
    document.getElementById('touch')?.removeAttribute('hidden');
    if (joyEl && knobEl) {
      joyEl.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          const t = e.changedTouches[0];
          const r = joyEl.getBoundingClientRect();
          joyState.id = t.identifier;
          joyState.cx = r.left + r.width / 2;
          joyState.cy = r.top + r.height / 2;
          setJoy(t.clientX, t.clientY);
        },
        { passive: false }
      );
      joyEl.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === joyState.id) setJoy(t.clientX, t.clientY);
          }
        },
        { passive: false }
      );
      const endJoy = (e: TouchEvent): void => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === joyState.id) {
            joyState.id = -1;
            joyState.vx = 0;
            joyState.vy = 0;
            knobEl.style.transform = '';
          }
        }
      };
      joyEl.addEventListener('touchend', endJoy);
      joyEl.addEventListener('touchcancel', endJoy);
    }
    document.getElementById('atk')?.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        pressAttack();
      },
      { passive: false }
    );
  }

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
        const j = touchMode ? joystickToInput(joyState.vx, -joyState.vy) : { forward: false, back: false, left: false, right: false };
        step(g, DT, {
          forward: !!(keys.KeyW || keys.ArrowUp) || j.forward,
          back: !!(keys.KeyS || keys.ArrowDown) || j.back,
          left: !!(keys.KeyA || keys.ArrowLeft) || j.left,
          right: !!(keys.KeyD || keys.ArrowRight) || j.right,
        });
        const ev = stepSwing(g, DT, enemies);
        for (const h of ev) comboHit(combo, g.time);
        for (const e of enemies) stepEnemy(e, DT, g, enemies);
      }
      acc -= DT;
    }
    if (touchMode) {
      const aa = autoAim(g.x, g.z, enemies);
      if (aa !== null) g.facing = aa;
    } else {
      g.facing = view.aimAt(mouse.x, mouse.y, g.x, g.z);
    }
    view.place(g.x, g.z, g.facing, getHitStop() > 0);
    view.setEnemy(enemy);
    if (comboEl) {
      comboEl.textContent = combo.count > 1 ? `COMBO ×${combo.count}` : '';
    }
    if (hudEl) {
      const hint = touchMode ? '左搖桿移動 · 右鈕普攻(自動瞄準)' : 'WASD 移動 · 滑鼠指向 · 左鍵/J 普攻(三段)';
      hudEl.textContent = `M1.5 · ${hint} · HP ${Math.max(0, g.hp)}`;
    }
    view.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
