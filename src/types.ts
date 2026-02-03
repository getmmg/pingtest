export interface Issue {
  id: string
  ts: number
  source: string
  severity: 'critical' | 'major' | 'minor' | 'info' | string
  message: string
  region?: string
  country?: string | null
  host?: string
  value?: number | null
  index?: string
  sourcetype?: string
  user?: string
  facility?: string
}

export interface Region {
  value: string
  label: string
}
