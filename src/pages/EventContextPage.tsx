import React, { useEffect, useState } from 'react'
import { Card, Typography } from 'antd'
import RegionSelect from '../components/RegionSelect'
import LocationSelect from '../components/LocationSelect'
import TimeframePicker from '../components/TimeframePicker'
import CorrelationTimeline from '../components/CorrelationTimeline'
import AlarmPane from '../components/AlarmPane'
import TrafficSnapshot from '../components/TrafficSnapshot'
import SplunkDrillDown from '../components/SplunkDrillDown'
import ExecutedChanges from '../components/ExecutedChanges'
import { fetchIssues, ensureDataset } from '../data/issues'
import type { Issue } from '../types'
import styles from './EventContextPage.module.css'

const { Title, Text } = Typography

export default function EventContextPage(): JSX.Element {
  const [range, setRange] = useState<[number, number]>([-96, 0])
  const [region, setRegion] = useState<string>('Global')
  const [location, setLocation] = useState<string | undefined>(undefined)
  const [issues, setIssues] = useState<Issue[]>([])

  useEffect(() => { ensureDataset() }, [])

  useEffect(() => {
    let mounted = true
    const QUARTER_MS = 15 * 60 * 1000
    const now = new Date()
    const q = Math.floor(now.getMinutes() / 15) * 15
    now.setMinutes(q, 0, 0)
    const nowRoundedTs = now.getTime()
    const startTs = nowRoundedTs + range[0] * QUARTER_MS
    const endTs = nowRoundedTs + range[1] * QUARTER_MS

    fetchIssues(startTs, endTs, region, location).then(list => { if (mounted) setIssues(list) })
    return () => { mounted = false }
  }, [range, region, location])

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Event Context</Title>
            <Text type="secondary">Contextual timeline and drill-downs</Text>
          </div>
          <div className={styles.controls}>
            <div className={styles.controlsLeft}>
              <TimeframePicker value={range} onChange={val => setRange(val)} />
            </div>

            <div className={styles.controlsRight}>
              <div style={{ minWidth: 200 }}>
                <Text strong style={{ display: 'block' }}>Region</Text>
                <RegionSelect
                  value={region}
                  onChange={val => { setRegion(val); setLocation(undefined) }}
                />
              </div>

              <div style={{ minWidth: 200 }}>
                <Text strong style={{ display: 'block' }}>Location</Text>
                <LocationSelect region={region} value={location} onChange={val => setLocation(val)} />
              </div>
            </div>
          </div>
        </header>

        <section className={styles.timelineSection}>
          <div className={styles.unifiedTitle}>Unified View</div>
          <Card className={styles.timelineCard}>
            <CorrelationTimeline issues={issues} />
          </Card>
        </section>

        <section className={styles.grid}>
          <div className={styles.colLeft}>
            <AlarmPane issues={issues} />
            <SplunkDrillDown issues={issues} />
          </div>

          <div className={styles.colRight}>
            <TrafficSnapshot issues={issues} />
            <ExecutedChanges issues={issues} />
          </div>
        </section>

        {/* filters moved to header */}
      </div>
    </div>
  )
}
