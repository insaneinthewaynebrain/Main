import { colourHex, isLightColour } from '../domain/vehicle/colours';

/** A simple side-on car drawn in the car's listed colour. */
export default function CarIllustration({ colour }: { colour?: string }) {
  const paint = colourHex(colour) ?? '#5eead4';
  const outline = isLightColour(paint) ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.18)';
  return (
    <svg className="car-illustration" viewBox="0 0 320 140" role="img" aria-label={colour ? `${colour.toLowerCase()} car illustration` : 'car illustration'}>
      <ellipse cx="160" cy="124" rx="140" ry="8" fill="rgba(0,0,0,0.35)" />
      <path
        d="M20 100 Q20 82 38 78 L86 71 Q104 47 134 41 L204 39 Q232 39 251 61 L270 73 Q300 78 302 97 L302 104 Q302 112 293 112 L29 112 Q20 112 20 104 Z"
        fill={paint}
        stroke={outline}
        strokeWidth="2"
      />
      <path d="M100 71 Q114 52 137 48 L176 47 L176 71 Z" fill="#0b0d11" opacity="0.85" />
      <path d="M184 47 L205 47 Q227 48 242 67 L244 71 L184 71 Z" fill="#0b0d11" opacity="0.85" />
      <path d="M40 84 Q160 74 296 86" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      {[78, 250].map((x) => (
        <g key={x}>
          <circle cx={x} cy="110" r="22" fill="#111317" />
          <circle cx={x} cy="110" r="11" fill="#6b7280" />
          <circle cx={x} cy="110" r="4" fill="#1b1d22" />
        </g>
      ))}
    </svg>
  );
}
