import type { CSSProperties } from 'react'
import type { StatsMetricItem } from './types'

type StatsMetricRailProps = {
  items: StatsMetricItem[]
  ariaLabel?: string
}

export default function StatsMetricRail({
  items,
  ariaLabel = '项目统计',
}: StatsMetricRailProps) {
  return (
    <section
      className="gst-metric-rail"
      aria-label={ariaLabel}
      style={{ '--gst-metric-count': Math.max(1, items.length) } as CSSProperties}
    >
      {items.map(item => (
        <article
          className="gst-metric"
          key={item.key}
          style={{ '--gst-item-accent': item.accent } as CSSProperties}
        >
          <div className="gst-metric-label">{item.label}</div>
          <div className="gst-metric-value">{item.value}</div>
          {item.sublabel != null && (
            <div className="gst-metric-sub">{item.sublabel}</div>
          )}
        </article>
      ))}
    </section>
  )
}

