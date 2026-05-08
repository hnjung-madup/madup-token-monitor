/*
  HP Inspired runtime tokens — mirror of CSS variables in src/index.css.
  Used by Recharts and other JS-side surfaces that cannot consume CSS variables directly.
*/

export const tokens = {
  primary: "#024ad8",
  primaryBright: "#296ef9",
  primaryDeep: "#0e3191",
  primarySoft: "#c9e0fc",
  onPrimary: "#ffffff",

  ink: "#1a1a1a",
  inkSoft: "#292929",
  charcoal: "#3d3d3d",
  graphite: "#636363",

  canvas: "#ffffff",
  cloud: "#f7f7f7",
  fog: "#e8e8e8",
  steel: "#c2c2c2",
  hairline: "#e8e8e8",

  bloomCoral: "#ff5050",
  bloomDeep: "#b3262b",
  stormSea: "#7fadbe",
  stormDeep: "#356373",
} as const;

export const chartPalette = [
  tokens.primary,
  tokens.ink,
  tokens.stormSea,
  tokens.bloomCoral,
  tokens.primaryBright,
  tokens.charcoal,
] as const;
