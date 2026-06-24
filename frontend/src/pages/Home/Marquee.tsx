import { useEffect, useMemo, useRef, useState } from 'react'
import './Home.css'

const FRAGMENTS = [
  "我化为透明之眼, 我归于虚无, 我洞悉万物",
  "CENTRUM UBIQUE, CIRCUMFERENTIA NUSQUAM", "AUDI VIDE TACE",
  "大音希声, 大象无形", "为学日益, 为道日损",
  "He revealeth the deep and secret things: he knoweth what is in the darkness, and the light dwelleth with him.",
  "Millions of spiritual creatures walk the earth / Unseen, both when we wake, and when we sleep.",
  "I live not in myself, but I become / Portion of that around me.",
  "El ojo que ves no es ojo porque tú lo veas; es ojo porque te ve.",
  "L'ombre est un œil immense et fixe.",
  "Всё во мне, и я во всём!",
  "Durch alle Wesen reicht der eine Raum: Weltinnenraum.",
  "存在を消し、世界を記録す"
]

const BLUE = '#5080ff'
const YELLOW = '#90b8ff'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Segment = { text: string; color: string; outlined: boolean }

function buildRowSegments(): Segment[] {
  const order = shuffle(FRAGMENTS)
  const repeated = [...order, ...order, ...order]
  return repeated.map(text => ({
    text,
    color: Math.random() < 0.10 ? YELLOW : BLUE,
    outlined: Math.random() < 0.35,
  }))
}

function Marquee() {
  const rows = useMemo(() => {
    const rowCount = 32
    const dirs = ['fwd', 'rev', 'slw']
    return Array.from({ length: rowCount }, (_, i) => ({
      direction: dirs[i % 3],
      segments: buildRowSegments(),
    }))
  }, [])

  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className={`marquee-bg${visible ? '' : ' paused'}`} ref={ref}>
      <div className="mq-rows">
        {rows.map((row, i) => (
          <div className="row" key={i}>
            <div className={`ri ${row.direction}`}>
              {[...row.segments, ...row.segments].map((seg, j) => (
                <span
                  key={j}
                  className={seg.outlined ? 'rt outlined' : 'rt'}
                  style={{ color: seg.color }}
                >
                  {seg.text} ·{' '}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Marquee
