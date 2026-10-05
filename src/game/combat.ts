// M1 純邏輯:三段連段、hitbox(錐)、敵兵 AI、combo、hit-stop。不 import three。
// 數值全來自 config.ts;出處見 DESIGN.md v0.4 §2.3/§3.1/§3.2 與 issue #1 brief。
import { config } from './config.ts';

export interface General {
  x: number;
  z: number;
  hp: number;
  facing: number;
  time: number;
  swing: Swing | null;
}

export interface Swing {
  n: 1 | 2 | 3;
  phase: 'windup' | 'active' | 'recover';
  t: number;
  hitIds: number[];
}

export type EnemyState = 'Spawn' | 'Chase' | 'Attack' | 'Stagger' | 'Die';

export interface Enemy {
  id: number;
  x: number;
  z: number;
  hp: number;
  state: EnemyState;
  stateT: number;
  cdT: number;
  facing: number;
  flashT: number;
}

export interface Combo {
  count: number;
  lastT: number;
}

export interface HitEvent {
  enemyId: number;
  damage: number;
  kill: boolean;
}

// M1.5 觸控(issue #2):搖桿→方向輸入、自動瞄準。純邏輯,不碰 DOM。
export function joystickToInput(vx: number, vy: number): {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
} {
  const dz = config.touch.deadzone;
  return {
    forward: vy > dz,
    back: vy < -dz,
    left: vx < -dz,
    right: vx > dz,
  };
}

export function autoAim(gx: number, gz: number, enemies: Enemy[]): number | null {
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (e.state === 'Die') continue;
    const d = Math.hypot(e.x - gx, e.z - gz);
    if (d <= config.touch.autoAimRange && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best ? Math.atan2(best.x - gx, best.z - gz) : null;
}

let hitStopT = 0;

export function createGeneral(x: number, z: number): General {
  return { x, z, hp: 100, facing: 0, time: 0, swing: null };
}

export function createEnemy(id: number, x: number, z: number): Enemy {
  return { id, x, z, hp: config.enemy.hp, state: 'Spawn', stateT: 0, cdT: 0, facing: 0, flashT: 0 };
}

export function resetHitStop(): void {
  hitStopT = 0;
}

export function getHitStop(): number {
  return hitStopT;
}

export function tickHitStop(dt: number): void {
  hitStopT = Math.max(0, hitStopT - dt);
}

export function hitEnemy(e: Enemy, dmg: number): 'stagger' | 'die' {
  e.hp -= dmg;
  e.flashT = 0.1;
  if (e.hp <= 0) {
    e.hp = 0;
    e.state = 'Die';
    e.stateT = 0;
    hitStopT = config.hitStop;
    return 'die';
  }
  e.state = 'Stagger';
  e.stateT = 0;
  return 'stagger';
}

export function stepEnemy(
  e: Enemy,
  dt: number,
  general: { x: number; z: number; hp: number },
  all: Enemy[]
): void {
  e.stateT += dt;
  e.cdT = Math.max(0, e.cdT - dt);
  e.flashT = Math.max(0, e.flashT - dt);
  if (e.state === 'Spawn') {
    if (e.stateT >= config.enemy.spawn) {
      e.state = 'Chase';
      e.stateT = 0;
    }
    return;
  }
  if (e.state === 'Stagger') {
    if (e.stateT >= config.stagger) {
      e.state = 'Chase';
      e.stateT = 0;
    }
    return;
  }
  if (e.state === 'Die') return;
  const dx = general.x - e.x;
  const dz = general.z - e.z;
  const dist = Math.hypot(dx, dz);
  e.facing = Math.atan2(dx, dz);
  if (e.state === 'Chase') {
    if (dist > config.enemy.range) {
      e.x += (dx / dist) * config.enemy.speed * dt;
      e.z += (dz / dist) * config.enemy.speed * dt;
    } else if (e.cdT <= 0) {
      e.state = 'Attack';
      e.stateT = 0;
    }
  } else if (e.state === 'Attack') {
    if (e.stateT >= config.enemy.windup) {
      if (dist <= config.enemy.range + 0.2) general.hp -= config.enemy.damage;
      e.cdT = config.enemy.cooldown;
      e.state = 'Chase';
      e.stateT = 0;
    }
  }
  for (const o of all) {
    if (o.id === e.id || o.state === 'Die') continue;
    const sx = e.x - o.x;
    const sz = e.z - o.z;
    const d = Math.hypot(sx, sz);
    if (d > 0 && d < config.enemy.minDist) {
      const push = (config.enemy.minDist - d) / 2;
      e.x += (sx / d) * push;
      e.z += (sz / d) * push;
    }
  }
}

export function createCombo(): Combo {
  return { count: 0, lastT: -Infinity };
}

export function comboHit(c: Combo, t: number): number {
  if (t - c.lastT > config.comboWindow) c.count = 0;
  c.lastT = t;
  return ++c.count;
}

export function startSwing(g: General, n: 1 | 2 | 3): number {
  let next: 1 | 2 | 3;
  if (!g.swing) next = 1;
  else if (g.swing.phase !== 'recover') return g.swing.n;
  else if (g.swing.n === 1) next = n === 2 ? 2 : 1;
  else if (g.swing.n === 2) next = n === 3 ? 3 : 1;
  else next = 1;
  g.swing = { n: next, phase: 'windup', t: 0, hitIds: [] };
  return next;
}

export function stepSwing(g: General, dt: number, enemies: Enemy[] = []): HitEvent[] {
  const s = g.swing;
  if (!s) return [];
  s.t += dt;
  const a = config.attack;
  if (s.phase === 'windup') {
    if (s.t >= a.windup) {
      s.phase = 'active';
      s.t = 0;
    }
    return [];
  }
  if (s.phase === 'active') {
    const events: HitEvent[] = [];
    const fx = Math.sin(g.facing);
    const fz = Math.cos(g.facing);
    const half = (a.hitbox.halfAngleDeg * Math.PI) / 180;
    for (const e of enemies) {
      if (e.state === 'Die' || s.hitIds.includes(e.id)) continue;
      const dx = e.x - g.x;
      const dz = e.z - g.z;
      const d = Math.hypot(dx, dz);
      if (d > a.hitbox.len + 0.3) continue;
      if (d > 1e-6) {
        const dot = (dx * fx + dz * fz) / d;
        if (Math.acos(Math.max(-1, Math.min(1, dot))) > half) continue;
      }
      s.hitIds.push(e.id);
      const r = hitEnemy(e, a.damage);
      events.push({ enemyId: e.id, damage: a.damage, kill: r === 'die' });
      if (s.n === 3 && d > 1e-6) {
        e.x += (dx / d) * a.pushback;
        e.z += (dz / d) * a.pushback;
      }
    }
    if (s.t >= a.active) {
      s.phase = 'recover';
      s.t = 0;
    }
    return events;
  }
  if (s.phase === 'recover' && s.t >= a.chainRecover) g.swing = null;
  return [];
}
