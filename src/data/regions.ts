export interface Region {
  value: string
  label: string
}

export const REGIONS: Region[] = [
  { value: 'Global', label: 'Global' },
  { value: 'EMEA', label: 'EMEA' },
  { value: 'APAC', label: 'APAC' },
  { value: 'AMER', label: 'AMER' },
  { value: 'CH', label: 'CH' }
]

export const COUNTRIES_BY_REGION: Record<string, string[]> = {
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

COUNTRIES_BY_REGION.Global = Array.from(
  new Set([].concat(COUNTRIES_BY_REGION.EMEA, COUNTRIES_BY_REGION.APAC, COUNTRIES_BY_REGION.AMER, COUNTRIES_BY_REGION.CH))
)

export function fetchRegions() {
  return Promise.resolve(REGIONS)
}

export function fetchCountries(regionValue?: string) {
  if (!regionValue) return Promise.resolve([])
  const list = COUNTRIES_BY_REGION[regionValue] || []
  return Promise.resolve(list)
}
