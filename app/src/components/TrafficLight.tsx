import type { Light } from '../domain/mot/trafficLight';

const LABEL: Record<Light, string> = { green: 'Green', amber: 'Amber', red: 'Red', none: 'No MOT due' };

/** Three-lamp traffic light with the active lamp lit. */
export function TrafficLight({ light, size = 'md' }: { light: Light; size?: 'sm' | 'md' }) {
  return (
    <span className={`tlight tlight--${size}`} role="img" aria-label={`MOT: ${LABEL[light]}`}>
      {(['red', 'amber', 'green'] as const).map((l) => (
        <span key={l} className={`lamp lamp--${l}${light === l ? ' lamp--on' : ''}`} />
      ))}
    </span>
  );
}

/** Single coloured dot, for compact lists. */
export function LightDot({ light }: { light: Light }) {
  return <span className={`dot dot--${light}`} aria-label={`MOT: ${LABEL[light]}`} role="img" />;
}

export const lightLabel = (l: Light) => LABEL[l];
