interface Props {
  change: number
  size?: 'sm' | 'lg'
}

export default function ChangeBadge({ change, size = 'sm' }: Props) {
  const up = change >= 0
  const cls = up ? 'chg-up' : 'chg-down'
  const arrow = up ? '▲' : '▼'
  return (
    <span className={`chg ${cls} chg-${size}`}>
      <span className="chg-arrow">{arrow}</span>
      <span className="chg-num">
        {up ? '+' : ''}
        {change.toFixed(2)}%
      </span>
    </span>
  )
}
