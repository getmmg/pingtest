import React, { useEffect, useState } from 'react'
import { Select } from 'antd'
import { fetchCountries } from '../data/regions'

const { Option } = Select

export default function LocationSelect({ region, value, onChange, placeholder = 'Select location', style }) {
  const [countries, setCountries] = useState([])
  useEffect(() => {
    let mounted = true
    if (!region) {
      setCountries([])
      return
    }
    fetchCountries(region).then(list => {
      if (mounted) setCountries(list)
    })
    return () => { mounted = false }
  }, [region])

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
      {countries.map(c => (
        <Option key={c} value={c}>
          {c}
        </Option>
      ))}
    </Select>
  )
}
