/**
 * The height nearest `wanted` at which a picture `dots` tall gets a whole number of
 * screen pixels per dot. Between whole numbers some dots come out a pixel wider than
 * their neighbours and an eye that was four dots across becomes three and a bit.
 * `density` is the screen's pixels per layout unit (`PixelRatio.get()`).
 */
export function wholeDots(wanted: number, dots: number, density: number): number {
  const perDot = Math.max(1, Math.round((wanted / dots) * density));
  return (perDot * dots) / density;
}
