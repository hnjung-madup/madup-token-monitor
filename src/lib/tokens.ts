/*
  Madup Console runtime tokens — mirror of CSS variables in src/index.css.
  Used by Recharts and other JS-side surfaces that cannot consume CSS vars directly.
*/

export const tokens = {
  // Canvas / surfaces
  canvasDeep: "#070B17",
  canvas: "#0B1126",
  canvasSoft: "#11183A",
  surface1: "#121A33",
  surface2: "#19233F",
  surface3: "#22304D",

  // Borders
  hairline: "rgba(255,255,255,0.06)",
  hairlineStrong: "rgba(255,255,255,0.12)",

  // Text
  textPrimary: "#E7ECF7",
  textSecondary: "#9CA8C5",
  textTertiary: "#6A7593",
  textFaint: "#454E6A",
  textOnAccent: "#06122B",

  // Azure (lone accent)
  azure: "#4DA3FF",
  azureBright: "#7BBCFF",
  azureDeep: "#2C7BE5",
  azureSoft: "rgba(77,163,255,0.14)",
  azureGlow: "rgba(77,163,255,0.35)",

  // Signal palette
  lime: "#9BE15D",
  limeDeep: "#6CB23B",
  limeSoft: "rgba(155,225,93,0.14)",
  amber: "#F5B544",
  amberDeep: "#C88A1C",
  amberSoft: "rgba(245,181,68,0.14)",
  coral: "#FF6B5C",
  coralDeep: "#D43F2E",
  coralSoft: "rgba(255,107,92,0.14)",
  violet: "#B68CFF",
  violetDeep: "#8358D9",
  violetSoft: "rgba(182,140,255,0.14)",
} as const;

export const chartPalette = [
  tokens.azure,
  tokens.violet,
  tokens.amber,
  tokens.lime,
  tokens.azureBright,
  tokens.coral,
] as const;
