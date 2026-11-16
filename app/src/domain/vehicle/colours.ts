/** DVLA's basic colour names → a display colour for the car illustration. */
const COLOURS: Record<string, string> = {
  BEIGE: '#d8c7a3', BLACK: '#1b1d22', BLUE: '#2f5fb3', BRONZE: '#9c6b30', BROWN: '#6b4a32',
  CREAM: '#efe6cc', GOLD: '#c9a548', GREEN: '#2f7a4f', GREY: '#7a808a', MAROON: '#6e1f2b',
  ORANGE: '#e2742b', PINK: '#e48aae', PURPLE: '#6c4aa3', RED: '#c8312f', SILVER: '#b9bec6',
  TURQUOISE: '#2fb3b0', WHITE: '#eef0f3', YELLOW: '#e8c22e',
};

export function colourHex(name?: string): string | undefined {
  if (!name) return undefined;
  const key = name.toUpperCase().split(/[\s/-]+/)[0];
  return COLOURS[key];
}

/** Light paint needs a dark outline to show up on the dark theme. */
export function isLightColour(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
