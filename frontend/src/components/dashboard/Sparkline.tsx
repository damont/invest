interface Props {
  data: number[]
  change: number
  width?: number
  height?: number
}

export default function Sparkline({ data, change, width = 96, height = 28 }: Props) {
  if (data.length < 2) {
    return <svg width={width} height={height} aria-hidden />
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const color = change >= 0 ? 'var(--up)' : 'var(--down)'
  const fill = change >= 0 ? 'var(--up-fade)' : 'var(--down-fade)'
  const lastX = width
  const lastY = height - ((data[data.length - 1] - min) / range) * height
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={fill} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  )
}
