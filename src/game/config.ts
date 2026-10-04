// 所有數值只住這裡。出處:DESIGN.md v0.3(§2.1 speed、§2.5 M0 邊界)。
// cam 為 M0 骨架值(設計文件尚未給相機數值,§4)。
export const config = {
  speed: 6,
  bounds: 20,
  cam: { y: 8, back: 10, targetY: 1.5 },
};

export type Config = typeof config;
