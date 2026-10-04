import { createGame, step } from './core.ts';
import { config } from './config.ts';
import { createScene } from './render.ts';

interface ProbeResult {
  start: number[];
  end: number[];
  dist: number;
  cfg: { speed: number; bounds: number };
}

const params = new URLSearchParams(location.search);

if (params.get('probe')) {
  const g = createGame();
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) {
    step(g, dt, { forward: true, back: false, left: false, right: false });
  }
  const out: ProbeResult = {
    start: [0, 0],
    end: [g.x, g.z],
    dist: Math.hypot(g.x, g.z),
    cfg: { speed: config.speed, bounds: config.bounds },
  };
  (window as unknown as { __probe: ProbeResult }).__probe = out;
  const el = document.getElementById('probe');
  if (el) {
    el.hidden = false;
    el.textContent = JSON.stringify(out, null, 2);
  }
  document.getElementById('hud')?.remove();
} else {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const view = createScene(canvas);
  const g = createGame();

  const keys: Record<string, boolean> = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
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
      step(g, DT, {
        forward: !!(keys.KeyW || keys.ArrowUp),
        back: !!(keys.KeyS || keys.ArrowDown),
        left: !!(keys.KeyA || keys.ArrowLeft),
        right: !!(keys.KeyD || keys.ArrowRight),
      });
      acc -= DT;
    }
    g.facing = view.aimAt(mouse.x, mouse.y, g.x, g.z);
    view.place(g.x, g.z, g.facing);
    view.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
