import React from 'react'
import { Card, List, Typography } from 'antd'
import type { Issue } from '../types'

const { Text } = Typography

export default function SplunkDrillDown({ issues }: { issues: Issue[] }) {
  const logs = issues.filter(i => i.source === 'splunk').slice(0, 10)

  return (
    <Card title="Splunk Drill-down">
      <List
        size="small"
        dataSource={logs}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              title={<Text strong>{item.ts ? new Date(item.ts).toLocaleString() : 'unknown'}</Text>}
                description={<Text>{item.message || 'no message'}</Text>}
            />
          </List.Item>
        )}
      />
    </Card>
  )
}
