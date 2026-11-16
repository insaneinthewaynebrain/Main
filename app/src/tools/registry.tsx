import type { ComponentType } from 'react';
import CheckScreen from './check/CheckScreen';
import ShortlistScreen from './shortlist/ShortlistScreen';
import { CalculatorIcon, ShortlistIcon } from '../components/icons';

export interface Tool {
  id: string;
  /** Short label for the tab bar. */
  label: string;
  /** Heading shown at the top of the screen. */
  title: string;
  Icon: ComponentType;
  Component: ComponentType;
}

/**
 * Every tool in the app. Add a new tool by creating a folder under src/tools/
 * and appending an entry here — it gets a tab automatically.
 */
export const tools: Tool[] = [
  { id: 'check', label: 'Check', title: 'Car finance', Icon: CalculatorIcon, Component: CheckScreen },
  { id: 'shortlist', label: 'Shortlist', title: 'Shortlist', Icon: ShortlistIcon, Component: ShortlistScreen },
];
