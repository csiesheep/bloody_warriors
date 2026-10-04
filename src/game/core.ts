import { config } from './config.ts';

export interface Input {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export interface GameState {
  x: number;
  z: number;
  facing: number;
  time: number;
}

export function createGame(): GameState {
  return { x: 0, z: 0, facing: 0, time: 0 };
}

export function step(g: GameState, dt: number, input: Input): void {
  let dx = 0;
  let dz = 0;
  if (input.forward) dz -= 1;
  if (input.back) dz += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  const len = Math.hypot(dx, dz);
  if (len > 0) {
    dx /= len;
    dz /= len;
    g.x += dx * config.speed * dt;
    g.z += dz * config.speed * dt;
  }
  g.x = Math.max(-config.bounds, Math.min(config.bounds, g.x));
  g.z = Math.max(-config.bounds, Math.min(config.bounds, g.z));
  g.time += dt;
}
