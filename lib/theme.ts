export const colors = {
  bg: '#0E1116',
  surface: '#171B22',
  surfaceAlt: '#1F242D',
  border: '#2A303A',
  text: '#F2F4F8',
  textDim: '#8A93A3',
  accent: '#4C8DFF',
  accentSoft: '#1D2B45',
  danger: '#FF5D5D',
  success: '#3DD68C',
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

// Validated for contrast and colour-vision separation against the dark surface.
export const muscleColors: Record<string, string> = {
  가슴: '#3B82F6',
  등: '#E4622A',
  어깨: '#17A67A',
  하체: '#A855F7',
  팔: '#B08A18',
  복근: '#0E9BB8',
  유산소: '#E0476A',
  기타: '#5C73C4',
};

export function muscleColor(group: string) {
  return muscleColors[group] ?? muscleColors['기타'];
}

/** One hue, rising steadily: the more a muscle is worked, the stronger it reads. */
export const intensityRamp = ['#3B82F6', '#639FFF', '#8FBCFF', '#BFD9FF'];
