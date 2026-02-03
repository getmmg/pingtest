import React from 'react'
import { Card, Typography, Tag, List } from 'antd'
import type { Issue } from '../types'

const { Title, Text } = Typography

export default function AlarmPane({ issues }: { issues: Issue[] }) {
  const severityOrder = ['critical', 'major', 'minor', 'info']
  const counts = issues.reduce((acc: Record<string, number>, it) => {
    acc[it.severity] = (acc[it.severity] || 0) + 1
    return acc
  }, {})

  const top = issues.slice(0, 6)

  return (
    <Card title={<div><Title level={5} style={{ margin: 0 }}>Zabbix Alarm Pane</Title><Text type="secondary">Severity · Host · Problem</Text></div>}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {severityOrder.map(s => (
          <Tag key={s} color={s === 'critical' ? 'red' : s === 'major' ? 'orange' : s === 'minor' ? 'blue' : undefined}>
            {s.toUpperCase()} {counts[s] || 0}
          </Tag>
        ))}
      </div>

      <List
        size="small"
        dataSource={top}
        renderItem={item => (
          <List.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div>
                <Text strong>{item.host}</Text>
                <div>{item.message}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary">{new Date(item.ts).toLocaleTimeString()}</Text>
                <div><Tag color={item.severity === 'critical' ? 'red' : item.severity === 'major' ? 'orange' : 'blue'}>{item.severity}</Tag></div>
              </div>
            </div>
          </List.Item>
        )}
      />
    </Card>
  )
}
