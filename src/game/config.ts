// 所有數值只住這裡。出處:DESIGN.md v0.4(§2.1 speed、§2.5 M0 邊界、§4 相機、§2.3 敵兵)。
export const config = {
  speed: 6,
  bounds: 20,
  cam: { y: 8, back: 10, targetY: 1.5 },
};

export type Config = typeof config;
