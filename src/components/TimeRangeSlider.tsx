import React from 'react'
import { Slider, Row, Col, Typography } from 'antd'
import styles from './TimeRangeSlider.module.css'

const { Text } = Typography

interface Props {
  value?: [number, number]
  onChange?: (val: [number, number]) => void
}

export default function TimeRangeSlider({ value = [-96, 0], onChange }: Props) {
  const QUARTER_MS = 15 * 60 * 1000

  const nowRounded = (() => {
    const d = new Date()
    const mins = d.getMinutes()
    const q = Math.floor(mins / 15) * 15
    d.setMinutes(q, 0, 0)
    return d.getTime()
  })()

  const formatTooltip = (quarterOffset: number) => {
    const ts = new Date(nowRounded + quarterOffset * QUARTER_MS)
    const hh = String(ts.getHours()).padStart(2, '0')
    const mm = String(ts.getMinutes()).padStart(2, '0')
    return `${ts.toLocaleDateString()} ${hh}:${mm}`
  }

  const marks: Record<number, { label: string }> = {
    [-288]: { label: '72h' },
    [-192]: { label: '48h' },
    [-96]: { label: '24h' },
    0: { label: 'Now' }
  }

  const MAX_WINDOW_QUARTERS = 8 * 4

  const handleChange = (newVal: any) => {
    if (!Array.isArray(newVal)) {
      if (onChange) onChange(newVal)
      return
    }
    let [start, end] = newVal as [number, number]
    const window = end - start
    if (window > MAX_WINDOW_QUARTERS) {
      start = end - MAX_WINDOW_QUARTERS
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
            step={1}
            value={value as any}
            onChange={handleChange}
            tipFormatter={formatTooltip}
            marks={marks}
          />
        </Col>
      </Row>
    </div>
  )
}
