// 所有數值只住這裡。出處:DESIGN.md v0.4(§2.1 speed、§2.5 M0 邊界、§4 相機、§2.3 敵兵、§3.1/§3.2 戰鬥)。
// 註「起始值」的是 orchestrator 起始值(issue #1 brief,不在設計文件)。
export const config = {
  speed: 6,
  bounds: 20,
  cam: { y: 8, back: 10, targetY: 1.5 }, // DESIGN.md §4(owner M0 實測確認)
  // M1 戰鬥(DESIGN.md v0.4 §3.1/§3.2/§2.3)
  attack: {
    damage: 15, // 普攻傷害(§3.1)
    windup: 0.2, // 起始值:每段前搖
    active: 0.1, // 起始值:有效幀
    chainRecover: 0.25, // 起始值:後搖 = 鏈接視窗
    hitbox: { len: 2.2, halfAngleDeg: 35, yMin: 0.5, yMax: 2.0 }, // §2.2 長錐(數值為起始值)
    pushback: 0.5, // 起始值:第 3 段短推
  },
  enemy: {
    hp: 30, // §2.3
    damage: 5, // §2.3
    speed: 3.5, // §2.3(起始值)
    windup: 0.6, // 起始值
    range: 1.5, // 起始值
    cooldown: 1.0, // 起始值
    spawn: 0.5, // 起始值
    minDist: 0.6, // 起始值:敵兵間分離
  },
  stagger: 0.3, // §3.1
  hitStop: 0.05, // §3.1
  comboWindow: 0.8, // §3.2
};

export type Config = typeof config;
