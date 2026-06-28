import type { CSSProperties } from 'react'
import type { ExternalSignalItem } from './types'

type ExternalSignalGridProps = {
  items: ExternalSignalItem[]
  title?: string
  description?: string
}

function SignalCard({ item }: { item: ExternalSignalItem }) {
  const samples = item.samples?.length ? item.samples : [28, 44, 39, 63, 55, 78, 70, 91]
  const content = (
    <>
      <div className="gst-signal-source">{item.source}</div>
      <h3>{item.title}</h3>
      <div className="gst-signal-value">{item.value}</div>
      {item.note != null && <div className="gst-signal-note">{item.note}</div>}
      <div className="gst-signal-ticks" aria-hidden="true">
        {samples.map((value, index) => (
          <i
            key={index}
            style={{
              height: `${Math.max(4, Math.min(100, value))}%`,
              '--gst-tick-delay': `${index * -130}ms`,
            } as CSSProperties}
          />
        ))}
      </div>
    </>
  )

  const style = { '--gst-signal-accent': item.accent } as CSSProperties

  return item.href ? (
    <a className="gst-signal" href={item.href} style={style}>
      {content}
    </a>
  ) : (
    <article className="gst-signal" style={style}>
      {content}
    </article>
  )
}

export default function ExternalSignalGrid({
  items,
  title = '',
  description = '',
}: ExternalSignalGridProps) {
  if (items.length === 0) return null

  return (
    <section className="gst-panel">
      <header className="gst-panel-head">
        <div>
          <span className="gst-panel-index">02</span>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </header>
      <div className="gst-signal-grid">
        {items.map(item => <SignalCard item={item} key={item.key} />)}
      </div>
    </section>
  )
}

