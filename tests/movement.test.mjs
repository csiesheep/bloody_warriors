import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/game/core.ts';
import { config } from '../src/game/config.ts';

// SPEC 抄自 DESIGN.md v0.3:§2.1 speed 6 m/s(起始值);§2.5 M0 邊界 = 正方形半邊 20 m。
const SPEC = { speed: 6, bounds: 20 };

test('group 0 · SPEC 常數對照', () => {
  assert.equal(config.speed, SPEC.speed, 'speed');
  assert.equal(config.bounds, SPEC.bounds, 'bounds');
});

test('玩家會動:1 秒前進輸入移動約 6 m', () => {
  const g = createGame();
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) {
    step(g, dt, { forward: true, back: false, left: false, right: false });
  }
  const dist = Math.hypot(g.x, g.z);
  assert.ok(Math.abs(dist - SPEC.speed) <= 0.1, `期望 ${SPEC.speed}±0.1,實際 ${dist}`);
  assert.ok(g.z < 0, `前進應為 -z,實際 z=${g.z}`);
});

test('邊界:一直走也出不了界', () => {
  const g = createGame();
  const dt = 1 / 60;
  for (let i = 0; i < 600; i++) {
    step(g, dt, { forward: true, back: false, left: false, right: false });
  }
  assert.ok(Math.abs(g.z) <= SPEC.bounds + 1e-9, `期望 ${-SPEC.bounds},實際 ${g.z}`);
});
