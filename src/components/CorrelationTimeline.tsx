import React from 'react'
import type { Issue } from '../types'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface Props {
  issues: Issue[]
}

const severityToY: Record<string, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  info: 1
}

function formatTime(ts?: number) {
  if (!ts) return 'unknown'
  return new Date(ts).toLocaleString()
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', padding: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 700 }}>{p.source} · {p.severity}</div>
      <div style={{ fontSize: 12, color: '#666' }}>{formatTime(p.ts)}</div>
      <div style={{ marginTop: 6 }}>{p.message}</div>
      {p.host && <div style={{ marginTop: 6, fontSize: 12, color: '#333' }}>Host: {p.host}</div>}
    </div>
  )
}

export default function CorrelationTimeline({ issues }: Props) {
  const now = Date.now()
  const points = issues.map((it) => ({
    x: it.ts || now,
    y: (severityToY[it.severity] || 0) + (Math.random() - 0.5) * 0.4,
    ...it
  }))

  const allTs = points.map(p => p.x)
  const minTs = allTs.length ? Math.min(...allTs) : now - 60 * 60 * 1000
  const maxTs = allTs.length ? Math.max(...allTs) : now
  const buffer = Math.max(15 * 60 * 1000, Math.round((maxTs - minTs) * 0.05))

  return (
    <div style={{ padding: 8 }}>
      <div style={{ height: 160, width: '100%', background: '#f5f7fa', borderRadius: 6, padding: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[minTs - buffer, maxTs + buffer]}
              tickFormatter={(v) => new Date(v).toLocaleTimeString()}
            />
            <YAxis type="number" dataKey="y" domain={[0, 5]} ticks={[1, 2, 3, 4]} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter name="events" data={points} fill="#ff6b6b" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
