import React from 'react'
import { Card, Timeline } from 'antd'
import type { Issue } from '../types'

export default function ExecutedChanges({ issues }: { issues: Issue[] }) {
  const changes = issues.filter(i => i.source === 'changes').slice(0, 8)

  return (
    <Card title="Executed Changes">
      <Timeline>
        {changes.length ? changes.map((c) => (
          <Timeline.Item key={c.id}>{c.message || 'Change executed'}</Timeline.Item>
        )) : <Timeline.Item>No recent changes</Timeline.Item>}
      </Timeline>
    </Card>
  )
}
