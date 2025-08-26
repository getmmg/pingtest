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
      value: source === 'cvaas-latency' ? randInt(100, 2000) : null
    }
  })

  _dataset = data.sort((a,b) => b.ts - a.ts)
  return _dataset
}

export function ensureDataset() {
  if (!_dataset) generateDataset()
  return _dataset
}

export function fetchIssues(startTs, endTs, region, country) {
  // Simulate async call
  ensureDataset()
  return new Promise(resolve => {
    setTimeout(() => {
      const filtered = _dataset.filter(d => d.ts >= startTs && d.ts <= endTs)
        .filter(d => {
          if (!region || region === 'Global') return true
          return d.region === region
        })
        .filter(d => {
          if (!country) return true
          return d.country === country
        })

      // Return top 1000 for safety
      resolve(filtered.slice(0, 2000))
    }, 120) // small latency
  })
}
