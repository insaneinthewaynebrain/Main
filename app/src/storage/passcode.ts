/** The app passcode, remembered on this device only. */
const KEY = 'carfin:passcode';

export function getPasscode(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setPasscode(value: string): void {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked — the passcode is just asked for again */
  }
}
