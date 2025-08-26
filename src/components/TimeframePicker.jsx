import React, { useEffect, useState } from 'react'
import { DatePicker, Space, Button } from 'antd'
import dayjs from 'dayjs'
import styles from './TimeframePicker.module.css'

const { RangePicker } = DatePicker

// Helper: convert Date objects to quarter units relative to the rounded 'now'
const QUARTER_MS = 15 * 60 * 1000

function roundNowToQuarter() {
  const d = new Date()
  const mins = d.getMinutes()
  const q = Math.floor(mins / 15) * 15
  d.setMinutes(q, 0, 0)
  return d.getTime()
}

export default function TimeframePicker({ value, onChange }) {
  // value is expected to be [startQuarter, endQuarter]
  const nowRounded = roundNowToQuarter()
  const [activePreset, setActivePreset] = useState(null)

  const PRESETS = {
    '1h': [-4, 0],
    '4h': [-16, 0],
    '8h': [-32, 0]
  }

  useEffect(() => {
    // determine if incoming value matches a preset
    if (!Array.isArray(value)) {
      setActivePreset(null)
      return
    }
    const match = Object.entries(PRESETS).find(([, r]) => Array.isArray(value) && value[0] === r[0] && value[1] === r[1])
    setActivePreset(match ? match[0] : null)
  }, [value])

  const toRangePickerValue = val => {
    if (!Array.isArray(val)) return undefined
    const startTs = nowRounded + val[0] * QUARTER_MS
    const endTs = nowRounded + val[1] * QUARTER_MS
    return [dayjs(startTs), dayjs(endTs)]
  }

  const fromRangePickerValue = vals => {
    if (!Array.isArray(vals)) return
    const s = vals[0].valueOf()
    const e = vals[1].valueOf()
    const startQ = Math.round((s - nowRounded) / QUARTER_MS)
    const endQ = Math.round((e - nowRounded) / QUARTER_MS)
    onChange([startQ, endQ])
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <RangePicker
          showTime={{ format: 'HH:mm' }}
          allowClear={false}
          value={toRangePickerValue(value)}
          onChange={fromRangePickerValue}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(PRESETS).map(([key, rangeArr]) => {
          const isActive = activePreset === key

          return (
            <Button
              key={key}
              className={isActive ? `${styles.btn} ${styles.active}` : styles.btn}
              onClick={() => {
                onChange(rangeArr)
                setActivePreset(key)
              }}
            >
              {key === '1h' ? 'Last 1 hr' : key === '4h' ? 'Last 4 hours' : 'Last 8 hours'}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
