import { COUNTRIES_BY_REGION } from './regions'

// Generate a large dummy dataset representing events from several systems.
// Each record: { id, ts, source, severity, message, region, country, host, value }

const SOURCES = ['splunk', 'zabbix', 'syslog', 'cvaas']
const SEVERITIES = ['critical', 'major', 'minor', 'info']

let _dataset = null

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickProcess() {
  const procs = ['nginx', 'node', 'java', 'python', 'sshd', 'postgres', 'redis', 'mysqld']
  return pick(procs)
}

function pickService() {
  const svcs = ['auth-service', 'billing', 'payments', 'api-gateway', 'worker', 'cache']
  return pick(svcs)
}

function pickIndex() {
  const idx = ['main', 'security', 'metrics', 'web', 'audit', 'application']
  return pick(idx)
}

function pickSourcetype() {
  const st = ['access_combined', 'json', 'syslog', 'apache:error', 'nginx:error', 'mysql']
  return pick(st)
}

function pickUser() {
  const users = ['svc_monitor', 'ops_admin', 'db_admin', 'alice', 'bob', 'charlie']
  return pick(users)
}

function makeMessage(source) {
  if (source === 'splunk') {
    const templates = [
      () => `Saved search 'High Error Rate' triggered: ${randInt(100, 1500)} events in last 5m (index=${pickIndex()})`,
      () => `Indexer queue full on index ${pickIndex()}, events being dropped`,
      () => `Forwarder disconnected from indexer ${randInt(1,5)} times; forwarder-id=${Math.random().toString(36).slice(2,8)}`,
      () => `Search 'long-running' exceeded runtime limit: ${randInt(3600,7200)}s, aborted`,
      () => `Parse error for sourcetype ${pickSourcetype()} in index ${pickIndex()}: unexpected token`,
      () => `Authentication failed for user ${pickUser()} from 198.51.100.${randInt(1,254)} (splunkd)`,
      () => `License violation: ${randInt(1,10)}GB over daily quota detected on index ${pickIndex()}`
    ]
    return pick(templates)()
  }

  if (source === 'zabbix') {
    const templates = [
      () => `Host unreachable (ICMP loss ${randInt(10,90)}%)`,
      () => `Zabbix agent not responding on ${pickProcess()} (agent timeout)`,
      () => `High CPU usage: ${randInt(85,99)}% on ${pickProcess()}`,
      () => `Disk space low: ${randInt(5,15)}% remaining on /var (${randInt(70,95)}% used)`,
      () => `Memory usage spike: ${randInt(75,98)}% on ${pickProcess()}`
    ]
    return pick(templates)()
  }

  if (source === 'syslog') {
    const templates = [
      () => `kernel: OOM killer invoked, killed ${pickProcess()}[${randInt(100,9999)}]`,
      () => `segfault at 0 ip ... in ${pickProcess()} (core dumped)`,
      () => `ssh: Failed password for invalid user admin from 203.0.113.${randInt(1,254)}`,
      () => `disk: I/O error, dev sda${randInt(1,4)}, sector ${randInt(100000,999999)}`,
      () => `systemd: Failed to start ${pickService()} service: Unit entered failed state`
    ]
    return pick(templates)()
  }

  if (source === 'cvaas') {
    return `CVaaS latency spike: ${randInt(150,3000)} ms`
  }

  return 'Event'
}

export function generateDataset(options = { now: Date.now(), hours: 72, count: 5000 }) {
  const { now, hours, count } = options
  const start = now - hours * 3600 * 1000
  const countriesPool = Object.values(COUNTRIES_BY_REGION).flat()

  const data = new Array(count).fill(0).map((_, i) => {
    // spread across timeframe, random timestamp
    const ts = randInt(start, now)
    const source = pick(SOURCES)
    const severity = pick(SEVERITIES)
    // choose region based on country mapping
    const country = pick(countriesPool)
    let region = 'Global'
    for (const r in COUNTRIES_BY_REGION) {
      if (COUNTRIES_BY_REGION[r].includes(country)) { region = r; break }
    }

    return {
      id: `evt-${i}-${ts}`,
      ts,
      source,
      severity,
      message: makeMessage(source),
      region,
      country,
      host: `${country.replace(/\s+/g, '-').toLowerCase()}-host-${randInt(1,200)}`,
      value: source === 'cvaas' ? randInt(100, 2000) : null,
      // extra fields used to build API outputs
      index: pickIndex(),
      sourcetype: pickSourcetype(),
      user: pickUser(),
      facility: pick(['auth','daemon','kernel','user','local0']),
    }
  })

  _dataset = data.sort((a,b) => b.ts - a.ts)
  return _dataset
}

export function ensureDataset() {
  if (!_dataset) generateDataset()
  return _dataset
}

// --- New: Mock API endpoints ---
// Each function returns a Promise that resolves to a realistic API-style JSON payload.

function sliceByTimeAndLocation(startTs, endTs, region, country) {
  ensureDataset()
  return _dataset.filter(d => d.ts >= startTs && d.ts <= endTs)
    .filter(d => {
      if (!region || region === 'Global') return true
      return d.region === region
    })
    .filter(d => {
      if (!country) return true
      return d.country === country
    })
}

export function fetchSplunkAPI({ startTs, endTs, region, country, limit = 500 }) {
  const rows = sliceByTimeAndLocation(startTs, endTs, region, country)
    .filter(r => r.source === 'splunk')
    .slice(0, limit)

  // Splunk-style result: results array with _raw and fields
  const results = rows.map(r => ({
    _raw: `${new Date(r.ts).toISOString()} ${r.host} ${r.message}`,
    _time: new Date(r.ts).toISOString(),
    index: r.index,
    sourcetype: r.sourcetype,
    host: r.host,
    severity: r.severity,
    user: r.user,
  }))

  const payload = {
    sid: `search_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    messages: [],
    results,
    result_count: results.length
  }

  return new Promise(resolve => setTimeout(() => resolve(payload), 80 + Math.random() * 120))
}

export function fetchZabbixAPI({ startTs, endTs, region, country, limit = 200 }) {
  const rows = sliceByTimeAndLocation(startTs, endTs, region, country)
    .filter(r => r.source === 'zabbix')
    .slice(0, limit)

  // Zabbix JSON-RPC style response for problem/events
  const result = rows.map(r => ({
    eventid: r.id,
    clock: Math.floor(r.ts / 1000), // unix time
    hosts: [{ host: r.host }],
    name: r.message,
    severity: (r.severity === 'critical' ? 'Disaster' : r.severity === 'major' ? 'High' : r.severity === 'Average' ? 'Average' : 'Information'),
    status: 'PROBLEM',
    acknowledged: 0
  }))

  const payload = {
    jsonrpc: '2.0',
    result,
    id: 1
  }

  return new Promise(resolve => setTimeout(() => resolve(payload), 100 + Math.random() * 200))
}

export function fetchSyslogAPI({ startTs, endTs, region, country, limit = 500 }) {
  const rows = sliceByTimeAndLocation(startTs, endTs, region, country)
    .filter(r => r.source === 'syslog')
    .slice(0, limit)

  const events = rows.map(r => ({
    timestamp: new Date(r.ts).toISOString(),
    host: r.host,
    facility: r.facility,
    severity: r.severity,
    message: r.message
  }))

  const payload = {
    status: 'ok',
    count: events.length,
    events
  }

  return new Promise(resolve => setTimeout(() => resolve(payload), 40 + Math.random() * 80))
}

export function fetchCvaasAPI({ startTs, endTs, region, country, limit = 500 }) {
  const rows = sliceByTimeAndLocation(startTs, endTs, region, country)
    .filter(r => r.source === 'cvaas')
    .slice(0, limit)

  const metrics = rows.map(r => ({
    timestamp: new Date(r.ts).toISOString(),
    host: r.host,
    region: r.region,
    country: r.country,
    latency_ms: r.value || randInt(50, 1500)
  }))

  const payload = {
    status: 'ok',
    metrics_count: metrics.length,
    metrics
  }

  return new Promise(resolve => setTimeout(() => resolve(payload), 30 + Math.random() * 60))
}

// Unified fetch that queries the four mock endpoints and returns a flattened array
// matching the UI's expected shape: { id, ts, source, severity, message, region, country, host, value }
export async function fetchIssues(startTs, endTs, region, country) {
  // call each endpoint in parallel
  let splunk, zabbix, syslog, cvaas
  try {
    [splunk, zabbix, syslog, cvaas] = await Promise.all([
      fetchSplunkAPI({ startTs, endTs, region, country }),
      fetchZabbixAPI({ startTs, endTs, region, country }),
      fetchSyslogAPI({ startTs, endTs, region, country }),
      fetchCvaasAPI({ startTs, endTs, region, country })
    ])
  } catch (err) {
    // If any endpoint call fails, log and continue with empty responses
    // (prevents uncaught exceptions from bubbling to the UI)
    // eslint-disable-next-line no-console
    console.error('fetchIssues: failed to call one or more mock endpoints', err)
    splunk = zabbix = syslog = cvaas = {}
  }

  const out = []

  // normalize splunk
  const splunkResults = Array.isArray(splunk && splunk.results) ? splunk.results : Array.isArray(splunk) ? splunk : []
  splunkResults.forEach(r => {
    out.push({
      id: `splunk-${r._time}-${Math.random().toString(36).slice(2,8)}`,
      ts: Date.parse(r._time),
      source: 'splunk',
      severity: r.severity || 'info',
      message: r._raw,
      region: region || 'Global',
      country: country || null,
      host: r.host,
      value: null
    })
  })

  // normalize zabbix
  const zabbixResults = Array.isArray(zabbix && zabbix.result) ? zabbix.result : Array.isArray(zabbix) ? zabbix : []
  zabbixResults.forEach(r => {
    out.push({
      id: `zabbix-${r.eventid}`,
      ts: r.clock * 1000,
      source: 'zabbix',
      severity: (r.severity === 'Disaster' ? 'critical' : r.severity === 'High' ? 'major' : r.severity === 'Average' ? 'minor' : 'info'),
      message: r.name,
      region: region || 'Global',
      country: country || null,
      host: (r.hosts && r.hosts[0] && r.hosts[0].host) || 'unknown',
      value: null
    })
  })

  // normalize syslog
  const syslogEvents = Array.isArray(syslog && syslog.events) ? syslog.events : Array.isArray(syslog) ? syslog : []
  syslogEvents.forEach(r => {
    out.push({
      id: `syslog-${r.timestamp}-${Math.random().toString(36).slice(2,8)}`,
      ts: Date.parse(r.timestamp),
      source: 'syslog',
      severity: r.severity || 'info',
      message: r.message,
      region: region || 'Global',
      country: country || null,
      host: r.host,
      value: null
    })
  })

  // normalize cvaas
  const cvaasMetrics = Array.isArray(cvaas && cvaas.metrics) ? cvaas.metrics : Array.isArray(cvaas) ? cvaas : []
  cvaasMetrics.forEach(r => {
    out.push({
      id: `cvaas-${r.timestamp}-${Math.random().toString(36).slice(2,8)}`,
      ts: Date.parse(r.timestamp),
      source: 'cvaas',
      severity: (r.latency_ms > 1000 ? 'critical' : r.latency_ms > 500 ? 'major' : 'minor'),
      message: `CVaaS latency ${r.latency_ms} ms`,
      region: r.region || region || 'Global',
      country: r.country || country || null,
      host: r.host,
      value: r.latency_ms
    })
  })

  // sort newest first
  out.sort((a,b) => b.ts - a.ts)
  // return up to 2000 items
  return out.slice(0, 2000)
}

// Keep backward-compatible fetch function name
export { fetchIssues as fetchIssuesAPI }
