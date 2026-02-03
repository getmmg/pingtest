import React, { useEffect, useState } from 'react'
import { Select } from 'antd'
import { fetchRegions } from '../data/regions'
import type { Region } from '../types'

const { Option } = Select

interface Props {
  value?: string
  onChange?: (val: string) => void
  placeholder?: string
  style?: React.CSSProperties
}

export default function RegionSelect({ value, onChange, placeholder = 'Select region', style }: Props) {
  const [regions, setRegions] = useState<Region[]>([])

  useEffect(() => {
    let mounted = true
    fetchRegions().then(list => {
      if (mounted) setRegions(list)
    })
    return () => { mounted = false }
  }, [])

  const finalStyle = style || { width: '100%', minWidth: 0, borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.04)' }

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={finalStyle}
      size="large"
      showSearch
      allowClear
      optionFilterProp="children"
    >
      {regions.map(r => (
        <Option key={r.value} value={r.value}>
          {r.label}
        </Option>
      ))}
    </Select>
  )
}
