import React, { useState } from 'react'
import { Card, Typography, Space } from 'antd'
import TimeRangeSlider from '../components/TimeRangeSlider'
import RegionSelect from '../components/RegionSelect'
import LocationSelect from '../components/LocationSelect'
import OutputCard from '../components/OutputCard'
import TimeframePicker from '../components/TimeframePicker'
import { Segmented } from 'antd'

const { Title, Text } = Typography

export default function EventContextPage() {
  // state stores quarter offsets (1 quarter = 15 minutes). default = last 24h -> -96..0
  const [range, setRange] = useState([-96, 0])
  const [region, setRegion] = useState('Global')
  const [location, setLocation] = useState(undefined)

  const QUARTER_MS = 15 * 60 * 1000

  // compute rounded now (same logic as slider) so display matches tooltip snapping
  const nowRounded = (() => {
    const d = new Date()
    const mins = d.getMinutes()
    const q = Math.floor(mins / 15) * 15
    d.setMinutes(q, 0, 0)
    return d.getTime()
  })()

  const formatFromQuarter = q => new Date(nowRounded + q * QUARTER_MS).toLocaleString()

  return (
    <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '720px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Title level={4} style={{ margin: 0 }}>Event Context</Title>
        </div>

        <Card style={{ borderRadius: 12, boxShadow: '0 8px 24px rgba(2,6,23,0.12)' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>

          <div style={{ marginTop: 12 }}>
            <TimeframePicker value={range} onChange={val => setRange(val)} />
          </div>

          {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>From</Text>
              <div>{formatFromQuarter(range[0])}</div>
            </div>
            <div>
              <Text strong>To</Text>
              <div>{formatFromQuarter(range[1])}</div>
            </div>
          </div> */}

          {/* Region / Location selectors */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <Text strong>Region</Text>
              <RegionSelect
                value={region}
                onChange={val => {
                  setRegion(val)
                  // reset location when region changes
                  setLocation(undefined)
                }}
                style={{ width: '100%', minWidth: 0 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <Text strong>Location</Text>
              <LocationSelect
                region={region}
                value={location}
                onChange={val => setLocation(val)}
                style={{ width: '100%', minWidth: 0 }}
              />
            </div>
          </div>
          
          {/* Output */}
          <OutputCard rangeQuarters={range} region={region} country={location} />
          </Space>
        </Card>
      </div>
    </div>
  )
}
