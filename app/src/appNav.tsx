/**
 * Lets screens switch tabs and hand data to each other.
 */
import { createContext, useContext } from 'react';
import type { ShortlistItem } from './storage/shortlist';

export interface AppNav {
  goTo(toolId: string): void;
  /** Load a shortlist car into the Check screen and switch to it. */
  openInCheck(item: ShortlistItem): void;
  /** Switch to the Shortlist and open one card. */
  openShortlistItem(id: string): void;
  /** Card waiting to be opened on the Shortlist tab. */
  pendingOpenId?: string;
  clearPendingOpen(): void;
  /** A link shared into the app (future iOS share sheet), waiting to be added. */
  pendingShare?: { url: string; text?: string };
  clearPendingShare(): void;
}

export const AppNavContext = createContext<AppNav>({
  goTo: () => {},
  openInCheck: () => {},
  openShortlistItem: () => {},
  clearPendingOpen: () => {},
  clearPendingShare: () => {},
});

export const useAppNav = () => useContext(AppNavContext);
