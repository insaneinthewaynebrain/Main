/**
 * UK registration number clean-up and validation.
 */

/** Uppercase and remove spaces and anything that isn't a letter or digit. */
export function normaliseRegistration(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const PATTERNS: { name: string; re: RegExp; format?: (r: string) => string }[] = [
  // Current style since 2001: AB12 CDE
  { name: 'current', re: /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/, format: (r) => `${r.slice(0, 4)} ${r.slice(4)}` },
  // Prefix 1983–2001: A123 BCD
  { name: 'prefix', re: /^[A-Z][0-9]{1,3}[A-Z]{3}$/, format: (r) => `${r.slice(0, -3)} ${r.slice(-3)}` },
  // Suffix 1963–1983: ABC 123D
  { name: 'suffix', re: /^[A-Z]{3}[0-9]{1,3}[A-Z]$/, format: (r) => `${r.slice(0, 3)} ${r.slice(3)}` },
  // Dateless and Northern Ireland: ABC 1234, 1234 AB, etc.
  { name: 'dateless', re: /^[A-Z]{1,3}[0-9]{1,4}$/, format: (r) => r.replace(/^([A-Z]+)([0-9]+)$/, '$1 $2') },
  { name: 'dateless-reversed', re: /^[0-9]{1,4}[A-Z]{1,3}$/, format: (r) => r.replace(/^([0-9]+)([A-Z]+)$/, '$1 $2') },
];

export function isValidRegistration(input: string): boolean {
  const reg = normaliseRegistration(input);
  return reg.length >= 2 && reg.length <= 7 && PATTERNS.some((p) => p.re.test(reg));
}

/** Display with the conventional space, e.g. "MK22GRN" → "MK22 GRN". */
export function formatRegistration(input: string): string {
  const reg = normaliseRegistration(input);
  const pattern = PATTERNS.find((p) => p.re.test(reg));
  return pattern?.format ? pattern.format(reg) : reg;
}
