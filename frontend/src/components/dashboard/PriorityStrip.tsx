import { type ReactNode } from 'react'
import type { DashboardStock } from '../../types'

interface Props {
  eyebrow: string
  title: string
  items: DashboardStock[]
  renderItem: (s: DashboardStock) => ReactNode
  empty: string
}

export default function PriorityStrip({ eyebrow, title, items, renderItem, empty }: Props) {
  return (
    <section className="priority-strip">
      <div className="section-header">
        <div className="section-header-left">
          <span className="section-eyebrow">{eyebrow}</span>
          <h2 className="section-title">{title}</h2>
          <span className="section-count">{items.length}</span>
        </div>
      </div>
      <div className="priority-row">
        {items.length === 0 ? (
          <div className="priority-empty">{empty}</div>
        ) : (
          items.map((s) => <div key={s.stock.id}>{renderItem(s)}</div>)
        )}
      </div>
    </section>
  )
}
