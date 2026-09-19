// A warm parchment palette: the app reads like a page from an illustrated ledger.
export const colors = {
  bg: '#F2E8D8',
  surface: '#FBF5EA',
  surfaceAlt: '#EFE2CB',
  border: '#DCC9A6',
  text: '#3D2B1F',
  textDim: '#8A7359',
  accent: '#9E2B2B',
  accentSoft: '#F3DEDA',
  danger: '#B3402E',
  success: '#4F7A3A',
  /** Chrome that frames the page: headers, tab bar, ornate rules. */
  chrome: '#2E2019',
  chromeText: '#EFE2CB',
  gold: '#C9A66B',
  goldSoft: '#E3D3B3',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

// Validated for contrast and colour-vision separation against the parchment surface.
export const muscleColors: Record<string, string> = {
  가슴: '#1F6FD0',
  등: '#C24A16',
  어깨: '#0E7A57',
  하체: '#7C3FBF',
  팔: '#8A6A0E',
  복근: '#0E6E88',
  유산소: '#B32748',
  기타: '#3F51A8',
};

export function muscleColor(group: string) {
  return muscleColors[group] ?? muscleColors['기타'];
}

/** One hue, darkening steadily: the more a muscle is worked, the deeper it reads. */
export const intensityRamp = ['#BE8078', '#9E5349', '#7E2F26', '#5A1712'];

/** An inset panel on the page itself, a shade warmer than the surface. */
export const paper = {
  bg: '#FBF5EA',
  bgAlt: '#F4EAD7',
  line: '#C9A66B',
  lineSoft: '#E3D3B3',
  ink: '#3D2B1F',
  inkDim: '#8A7359',
  fill: '#9E2B2B',
  track: '#E3D3B3',
  accent: '#9E2B2B',
};
