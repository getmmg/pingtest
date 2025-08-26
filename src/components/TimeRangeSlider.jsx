import React from 'react'
import { Slider, Row, Col, Typography } from 'antd'
import styles from './TimeRangeSlider.module.css'

const { Text } = Typography

// This component uses "hours ago" values: 0 === now, 72 === 72 hours ago.
// The slider range is [0..72] and returns an array [startHoursAgo, endHoursAgo].
export default function TimeRangeSlider({ value = [-96, 0], onChange }) {
  // Use integer quarter units: 1 unit = 15 minutes. 0 = rounded "now" (most recent past quarter).
  const QUARTER_MS = 15 * 60 * 1000

  // Round current time down to the last quarter (so "Now" snaps to previous 00/15/30/45)
  const nowRounded = (() => {
    const d = new Date()
    const mins = d.getMinutes()
    const q = Math.floor(mins / 15) * 15
    d.setMinutes(q, 0, 0)
    return d.getTime()
  })()

  const formatTooltip = quarterOffset => {
    const ts = new Date(nowRounded + quarterOffset * QUARTER_MS)
    const hh = String(ts.getHours()).padStart(2, '0')
    const mm = String(ts.getMinutes()).padStart(2, '0')
    return `${ts.toLocaleDateString()} ${hh}:${mm}`
  }

  const marks = {
    [-288]: { label: '72h' },
    [-192]: { label: '48h' },
    [-96]: { label: '24h' },
    0: { label: 'Now' }
  }

  // Maximum selectable window in quarters (8 hours = 8*4 = 32 quarters)
  const MAX_WINDOW_QUARTERS = 8 * 4

  // Internal onChange wrapper ensures window <= MAX_WINDOW_QUARTERS
  const handleChange = newVal => {
    if (!Array.isArray(newVal)) {
      if (onChange) onChange(newVal)
      return
    }
    let [start, end] = newVal
    // start <= end (more negative -> older). compute window as end - start
    const window = end - start
    if (window > MAX_WINDOW_QUARTERS) {
      // move start forward so window equals max
      start = end - MAX_WINDOW_QUARTERS
      // clamp to min
      if (start < -288) start = -288
    }
    if (onChange) onChange([start, end])
  }

  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]} align="middle">
        <Col span={24}>
          <Text strong>Time range (past 72 hours)</Text>
        </Col>
        <Col span={24}>
          <Slider
            range
            min={-288}
            max={0}
            step={1} /* 1 quarter = 15 minutes */
            value={value}
            onChange={handleChange}
            tipFormatter={formatTooltip}
            marks={marks}
          />
        </Col>
      </Row>
    </div>
  )
}
