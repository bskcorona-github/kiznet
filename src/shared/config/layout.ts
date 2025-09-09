// 単一箇所で家系図のレイアウトに関するパラメータを管理する
export const LAYOUT = {
  card: {
    width: 160,
    height: 80,
  },
  layout: {
    minDistance: 40,
    generationHeight: 160,
    familySpacing: 220,
  },
  spouse: {
    distance: 70,
    stub: 12,
    extra: 20,
    lineOffset: 35,
  },
  parent: {
    intermediateDrop: 30,
  },
} as const;

export type LayoutConfigConst = typeof LAYOUT;

