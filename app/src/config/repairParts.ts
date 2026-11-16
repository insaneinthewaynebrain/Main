/**
 * Maps MOT advisory/defect wording to the part or repair it usually needs.
 * First match wins, so put specific patterns before general ones.
 * `search` is the phrase used for parts and repair-cost searches.
 */
export interface RepairRule {
  pattern: RegExp;
  /** What to show, e.g. "Front brake discs". `{axle}` becomes Front/Rear when the text says so. */
  part: string;
  search: string;
  /** 'part' = something you can buy; 'repair' = mostly labour/diagnosis. */
  kind: 'part' | 'repair';
}

export const repairRules: RepairRule[] = [
  { pattern: /brake (disc|rotor)/i, part: '{axle}brake discs', search: '{axle}brake discs', kind: 'part' },
  { pattern: /brake (pad|lining|shoe)/i, part: '{axle}brake pads', search: '{axle}brake pads', kind: 'part' },
  { pattern: /brake (pipe|hose)/i, part: 'Brake pipes / hoses', search: 'brake pipe replacement', kind: 'repair' },
  { pattern: /parking brake|handbrake/i, part: 'Handbrake cable / adjustment', search: 'handbrake cable', kind: 'part' },
  { pattern: /tyre|tire/i, part: 'Tyres', search: 'tyres', kind: 'part' },
  { pattern: /wiper/i, part: 'Wiper blades', search: 'wiper blades', kind: 'part' },
  { pattern: /windscreen|windshield/i, part: 'Windscreen repair', search: 'windscreen replacement', kind: 'repair' },
  { pattern: /shock absorber|damper/i, part: '{axle}shock absorbers', search: '{axle}shock absorbers', kind: 'part' },
  { pattern: /coil spring|spring/i, part: '{axle}coil springs', search: '{axle}coil spring', kind: 'part' },
  { pattern: /anti-?roll bar|drop link|stabiliser/i, part: 'Anti-roll bar links', search: 'anti roll bar drop link', kind: 'part' },
  { pattern: /track rod/i, part: 'Track rod ends', search: 'track rod end', kind: 'part' },
  { pattern: /ball joint/i, part: 'Ball joints', search: 'ball joint', kind: 'part' },
  { pattern: /bush/i, part: 'Suspension bushes', search: 'suspension wishbone bush', kind: 'part' },
  { pattern: /wheel bearing/i, part: 'Wheel bearing', search: 'wheel bearing', kind: 'part' },
  { pattern: /constant velocity|cv joint|cv boot|drive ?shaft/i, part: 'CV boot / driveshaft', search: 'cv boot', kind: 'part' },
  { pattern: /steering rack|power steering/i, part: 'Steering rack', search: 'steering rack', kind: 'part' },
  { pattern: /exhaust|silencer|catalytic/i, part: 'Exhaust', search: 'exhaust repair', kind: 'repair' },
  { pattern: /oil leak/i, part: 'Oil leak repair', search: 'oil leak repair', kind: 'repair' },
  { pattern: /engine mount/i, part: 'Engine mount', search: 'engine mount', kind: 'part' },
  { pattern: /number plate lamp|registration plate lamp/i, part: 'Number plate bulb', search: 'number plate bulb', kind: 'part' },
  { pattern: /headlamp|head lamp|headlight/i, part: 'Headlamp bulb / unit', search: 'headlight bulb', kind: 'part' },
  { pattern: /lamp|bulb|indicator/i, part: 'Bulbs', search: 'bulb', kind: 'part' },
  { pattern: /seat ?belt/i, part: 'Seat belt', search: 'seat belt', kind: 'part' },
  { pattern: /corro|rust/i, part: 'Corrosion / welding repair', search: 'welding corrosion repair', kind: 'repair' },
];

/** Where the "see prices" links go. `{q}` is replaced with the encoded search. */
export const priceSearchSites = {
  parts: { label: 'Parts prices (eBay)', url: 'https://www.ebay.co.uk/sch/i.html?_nkw={q}' },
  repair: { label: 'Repair cost (Google)', url: 'https://www.google.com/search?q={q}' },
};
