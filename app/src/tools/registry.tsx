import type { ComponentType } from 'react';
import CarFinanceCalculator from './carFinance/CarFinanceCalculator';
import { CalculatorIcon } from '../components/icons';

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
  {
    id: 'car-finance',
    label: 'Finance',
    title: 'Car finance',
    Icon: CalculatorIcon,
    Component: CarFinanceCalculator,
  },
];
