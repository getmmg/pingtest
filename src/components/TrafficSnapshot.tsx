import React from 'react'
import { Card, Typography } from 'antd'
import type { Issue } from '../types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const { Title } = Typography

function toSeries(values: number[]) {
  return values.map((v, i) => ({ x: i, y: Math.round(v) }))
}

export default function TrafficSnapshot({ issues }: { issues: Issue[] }) {
  const vals = issues.filter(i => i.source === 'cvaas').slice(0, 60).map(i => i.value || 0)
  const series = vals.length ? vals : new Array(30).fill(0).map(() => Math.round(Math.random() * 100))
  const data = toSeries(series)

  const avg = Math.round(series.reduce((a, b) => a + b, 0) / series.length)

  return (
    <Card title={<Title level={5} style={{ margin: 0 }}>Traffic Snapshot</Title>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="x" hide />
              <YAxis hide />
              <Tooltip formatter={(value: any) => `${value}`} />
              <Line type="monotone" dataKey="y" stroke="#1890ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ width: 120 }}>
          <div style={{ fontWeight: 700, fontSize: 20 }}>~{avg}</div>
          <div style={{ color: '#888' }}>Avg latency (ms)</div>
        </div>
      </div>
    </Card>
  )
}
