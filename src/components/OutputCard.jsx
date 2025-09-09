import React, { useEffect, useState } from 'react'
import { Card, Typography, List, Tag, Spin } from 'antd'
import { fetchIssues, generateDataset } from '../data/issues'

const { Title, Text } = Typography

export default function OutputCard({ rangeQuarters = [-96, 0], region, country }) {
  const [loading, setLoading] = useState(true)
  const [issues, setIssues] = useState([])
  const [activeSeverity, setActiveSeverity] = useState(null)
  const [activeSources, setActiveSources] = useState([])

  useEffect(() => {
    // ensure dataset exists (heavy gen) - run once
    generateDataset({ now: Date.now(), hours: 72, count: 8000 })
  }, [])

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      const QUARTER_MS = 15 * 60 * 1000
      // align now to nearest quarter like the slider
      const now = new Date()
      const q = Math.floor(now.getMinutes() / 15) * 15
      now.setMinutes(q, 0, 0)
      const nowRoundedTs = now.getTime()
      const startTs = nowRoundedTs + rangeQuarters[0] * QUARTER_MS
      const endTs = nowRoundedTs + rangeQuarters[1] * QUARTER_MS

  let list = await fetchIssues(startTs, endTs, region, country)
  // sort newest first
  list = list.sort((a, b) => b.ts - a.ts)
  if (!mounted) return
  setIssues(list)
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [rangeQuarters, region, country])

  // apply severity filter
  const severityOrder = ['critical', 'major', 'minor', 'info']
  const counts = issues.reduce((acc, it) => {
    acc[it.severity] = (acc[it.severity] || 0) + 1
    return acc
  }, {})

  const sourceCounts = issues.reduce((acc, it) => {
    acc[it.source] = (acc[it.source] || 0) + 1
    return acc
  }, {})

  // apply severity and source filters
  const filteredBySeverity = activeSeverity ? issues.filter(i => i.severity === activeSeverity) : issues
  const filteredIssues = activeSources && activeSources.length > 0
    ? filteredBySeverity.filter(i => activeSources.includes(i.source))
    : filteredBySeverity
  const totalAll = issues.length
  const total = filteredIssues.length

  return (
    <Card style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>{total}</Title>
          <Text type="secondary">Total issues {total !== totalAll ? `(${total} of ${totalAll})` : ''}</Text>
        </div>
        <div>
          <Text type="secondary">Filtered by</Text>
          <div>{region}{country ? ` / ${country}` : ''}{activeSources && activeSources.length ? ` / ${activeSources.join(', ')}` : ''}{activeSeverity ? ` / ${activeSeverity}` : ''}</div>
        </div>
      </div>

      {/* Severity badges */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        {severityOrder.map(s => {
          const color = s === 'critical' ? 'red' : s === 'major' ? 'orange' : s === 'minor' ? 'blue' : 'default'
          const isActive = activeSeverity === s
          return (
            <Tag
              key={s}
              color={color === 'default' ? undefined : color}
              onClick={() => setActiveSeverity(isActive ? null : s)}
              style={{
                cursor: 'pointer',
                border: isActive ? '2px solid rgba(0,0,0,0.12)' : undefined,
                fontWeight: isActive ? 700 : 500,
                padding: '4px 10px'
              }}
            >
              <span style={{ textTransform: 'capitalize', fontWeight: isActive ? 700 : 500 }}>{s}</span>
              <span style={{ marginLeft: 8, fontWeight: isActive ? 800 : 600 }}>{counts[s] || 0}</span>
            </Tag>
          )
        })}
        {activeSeverity && (
          <Tag onClick={() => setActiveSeverity(null)} style={{ cursor: 'pointer' }}>
            Clear
          </Tag>
        )}
      </div>
      {/* Source badges (tools) */}
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {Object.keys(sourceCounts).map(src => {
          const isActive = activeSources.includes(src)
          return (
            <Tag
              key={src}
              onClick={() => {
                if (isActive) setActiveSources(s => s.filter(x => x !== src))
                else setActiveSources(s => [...s, src])
              }}
              style={{ cursor: 'pointer', background: isActive ? '#e6f7ff' : undefined, border: isActive ? '1px solid #91d5ff' : undefined }}
            >
              <span style={{ textTransform: 'capitalize', marginRight: 6 }}>{src}</span>
              <span style={{ fontWeight: 700 }}>{sourceCounts[src]}</span>
            </Tag>
          )
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin /></div>
        ) : (
          <List
            size="small"
            dataSource={filteredIssues}
            renderItem={item => {
              const d = new Date(item.ts)
              const short = d.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
              const agoMs = Date.now() - item.ts
              const ago = agoMs < 60000 ? `${Math.floor(agoMs/1000)}s ago` : agoMs < 3600000 ? `${Math.floor(agoMs/60000)}m ago` : `${Math.floor(agoMs/3600000)}h ago`

              return (
                <List.Item>
                  <List.Item.Meta
                    title={<div><Text strong>{item.source}</Text> <Tag color={item.severity === 'critical' ? 'red' : item.severity === 'major' ? 'orange' : 'blue'}>{item.severity}</Tag></div>}
                    description={<div><Text type="secondary">{short} · {ago} · {item.country} · {item.host}</Text><div>{item.message}{item.value ? ` (latency ${item.value} ms)` : ''}</div></div>}
                  />
                </List.Item>
              )
            }}
          />
        )}
      </div>
    </Card>
  )
}
