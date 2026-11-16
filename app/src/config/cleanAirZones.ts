/**
 * Clean air zone standards and zones. Checked against GOV.UK on the date below.
 * TfL's site blocks automated reading, so the London entry follows the same
 * published car standard and the app always links to TfL's own checker.
 */
export const cleanAirConfig = {
  checkedOn: '2026-11-16',
  source: 'https://www.gov.uk/guidance/driving-in-a-clean-air-zone',

  /** Minimum Euro standard for cars to avoid a charge. */
  minimumEuro: { petrol: 4, diesel: 6 },

  /**
   * Rule of thumb when DVLA has no Euro status: new cars had to meet Euro 4
   * (petrol) from January 2006 and Euro 6 (diesel) from September 2015.
   * Earlier cars may comply too, so these are labelled "likely".
   */
  dateFallback: {
    petrolEuro4From: '2006-01-01',
    /** Petrol cars from here up to petrolEuro4From may or may not meet Euro 4. */
    petrolMaybeFrom: '2001-01-01',
    dieselEuro6From: '2015-09-01',
  },

  zones: [
    {
      name: 'London ULEZ',
      chargesCars: true,
      checker: { label: 'TfL vehicle checker', url: 'https://tfl.gov.uk/modes/driving/check-your-vehicle/' },
    },
    {
      name: 'Birmingham, Bristol (Class D)',
      chargesCars: true,
      checker: { label: 'GOV.UK clean air zone checker', url: 'https://www.gov.uk/clean-air-zones' },
    },
    {
      name: 'Bath, Bradford, Portsmouth, Sheffield, Tyneside',
      chargesCars: false,
      note: 'Private cars are not charged',
      checker: { label: 'GOV.UK clean air zone checker', url: 'https://www.gov.uk/clean-air-zones' },
    },
    {
      name: 'Scotland LEZs (Glasgow, Edinburgh, Aberdeen, Dundee)',
      chargesCars: true,
      note: 'Penalty rather than a daily charge',
      checker: { label: 'Scotland LEZ checker', url: 'https://www.lowemissionzones.scot/' },
    },
  ],
};

export type CleanAirConfig = typeof cleanAirConfig;
