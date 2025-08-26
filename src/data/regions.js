// regions.js
// Exports region list and countries per region. Provides simple async fetch functions
// so the components can be easily swapped to call a real API in the future.

export const REGIONS = [
  { value: 'Global', label: 'Global' },
  { value: 'EMEA', label: 'EMEA' },
  { value: 'APAC', label: 'APAC' },
  { value: 'AMER', label: 'AMER' },
  { value: 'CH', label: 'CH' }
]

// Representative country lists for demo; replace or fetch from API as needed.
export const COUNTRIES_BY_REGION = {
  CH: ['Switzerland'],
  EMEA: [
    'United Kingdom',
    'Germany',
    'France',
    'Netherlands',
    'Spain',
    'Italy',
    'South Africa'
  ],
  APAC: [
    'China',
    'India',
    'Japan',
    'South Korea',
    'Singapore',
    'Australia'
  ],
  AMER: [
    'United States',
    'Canada',
    'Mexico',
    'Brazil',
    'Argentina'
  ]
}

// Global will flatten the others
COUNTRIES_BY_REGION.Global = Array.from(
  new Set([].concat(COUNTRIES_BY_REGION.EMEA, COUNTRIES_BY_REGION.APAC, COUNTRIES_BY_REGION.AMER, COUNTRIES_BY_REGION.CH))
)

// Simulate async API
export function fetchRegions() {
  return Promise.resolve(REGIONS)
}

export function fetchCountries(regionValue) {
  if (!regionValue) return Promise.resolve([])
  // Return empty for unknown
  const list = COUNTRIES_BY_REGION[regionValue] || []
  return Promise.resolve(list)
}
