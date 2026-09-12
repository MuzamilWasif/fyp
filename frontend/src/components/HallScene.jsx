import { useMemo } from 'react'

/**
 * The examination hall as the detection engine sees it: a perspective floor
 * plan with desks, tracked students and three confirmed detections.
 *
 * Geometry is derived, not hand-placed, so the reticles and their confidence
 * readouts always line up with the desk they are locked onto.
 */
const W = 835
const H = 900
const CX = W / 2

const ROWS = [
  { y: 150, h: 28, w: 46, gap: 64 },
  { y: 240, h: 37, w: 61, gap: 84 },
  { y: 348, h: 49, w: 81, gap: 111 },
  { y: 480, h: 65, w: 107, gap: 146 },
  { y: 640, h: 86, w: 142, gap: 193 }
]

/** Which desks the engine has flagged, and with what confidence. */
const FLAGGED = [
  { row: 1, col: 0, confidence: '0.94' },
  { row: 2, col: 2, confidence: '0.88' },
  { row: 3, col: 1, confidence: '0.96' }
]

function buildDesks() {
  const desks = []
  ROWS.forEach((r, row) => {
    ;[-1.5, -0.5, 0.5, 1.5].forEach((offset, col) => {
      const cx = CX + offset * r.gap
      const bottom = r.y + r.h
      const topW = r.w * 0.78
      const halfTop = topW / 2
      const halfBottom = r.w / 2
      desks.push({
        row,
        col,
        cx,
        top: r.y,
        bottom,
        width: r.w,
        // desk surface, narrower at the far edge
        d: `M${cx - halfBottom} ${bottom} L${cx - halfTop} ${r.y} L${cx + halfTop} ${r.y} L${cx + halfBottom} ${bottom} Z`,
        // chair back, behind the desk
        chair: `M${cx - halfTop * 0.62} ${r.y - r.h * 0.3} Q${cx} ${r.y - r.h * 0.62} ${cx + halfTop * 0.62} ${r.y - r.h * 0.3}`,
        hx: cx,
        hy: r.y + r.h * 0.44,
        hr: r.w * 0.155
      })
    })
  })
  return desks
}

function buildReticles(desks) {
  return FLAGGED.map(({ row, col, confidence }) => {
    const desk = desks.find((d) => d.row === row && d.col === col)
    const pad = desk.width * 0.24
    const bx = desk.cx - desk.width / 2 - pad
    const by = desk.top - pad * 1.4
    const bw = desk.width + pad * 2
    const bh = desk.bottom - desk.top + pad * 2.2
    const arm = Math.min(bw, bh) * 0.28

    return {
      confidence,
      bx, by, bw, bh,
      cx: desk.hx,
      cy: desk.hy,
      // dashed line of sight from the ceiling camera
      sight: `M${CX} 40 L${desk.hx} ${desk.hy}`,
      corners: [
        `M${bx} ${by + arm} L${bx} ${by} L${bx + arm} ${by}`,
        `M${bx + bw - arm} ${by} L${bx + bw} ${by} L${bx + bw} ${by + arm}`,
        `M${bx + bw} ${by + bh - arm} L${bx + bw} ${by + bh} L${bx + bw - arm} ${by + bh}`,
        `M${bx + arm} ${by + bh} L${bx} ${by + bh} L${bx} ${by + bh - arm}`
      ].join(' '),
      labelX: bx + bw + 8,
      labelY: by - 6
    }
  })
}

/** Room edges converging on the camera's vanishing point. */
const WALLS = [
  'M250 150 L-40 900',
  'M585 150 L875 900',
  'M250 150 L585 150',
  'M196 262 L639 262'
]

const SCANLINES = Array.from({ length: 14 }, (_, i) => ({
  y: 64 + i * 58,
  o: i % 3 === 0 ? 0.05 : 0.025
}))

export default function HallScene({ className = '' }) {
  const desks = useMemo(buildDesks, [])
  const reticles = useMemo(() => buildReticles(desks), [desks])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Schematic of an examination hall with three flagged desks under AI surveillance"
    >
      <g>
        {SCANLINES.map((ln) => (
          <rect key={ln.y} x="0" y={ln.y} width={W} height="1" fill="#2DE3A7" opacity={ln.o} />
        ))}
      </g>

      <g stroke="#2DE3A7" fill="none" strokeWidth="1" opacity=".22">
        {WALLS.map((d) => <path key={d} d={d} />)}
      </g>

      <g>
        {desks.map((dk) => (
          <g key={`${dk.row}-${dk.col}`}>
            <path d={dk.d} fill="#0D131C" fillOpacity=".6" stroke="#2DE3A7" strokeOpacity=".42" strokeWidth="1" />
            <path d={dk.chair} fill="none" stroke="#2DE3A7" strokeOpacity=".2" strokeWidth="1" />
            <circle cx={dk.hx} cy={dk.hy} r={dk.hr} fill="none" stroke="#2DE3A7" strokeOpacity=".3" strokeWidth="1" />
          </g>
        ))}
      </g>

      <g>
        {reticles.map((r) => (
          <g key={r.confidence}>
            <path d={r.sight} stroke="#2DE3A7" strokeOpacity=".16" strokeWidth="1" strokeDasharray="2 6" fill="none" />
            <rect x={r.bx} y={r.by} width={r.bw} height={r.bh} fill="none" stroke="#2DE3A7" strokeOpacity=".22" strokeWidth="1" />
            <path d={r.corners} stroke="#2DE3A7" strokeWidth="1.5" fill="none" strokeOpacity=".95" />
            <circle cx={r.cx} cy={r.cy} r="2" fill="#2DE3A7" />
            <text
              x={r.labelX} y={r.labelY}
              fill="#2DE3A7" fontSize="10" letterSpacing=".08em"
              fontFamily="'JetBrains Mono', monospace"
            >
              {r.confidence}
            </text>
          </g>
        ))}
      </g>

      <g opacity=".5" stroke="#1E2937" strokeWidth="1">
        <path d={`M0 60 L${W} 60`} />
        <path d={`M0 812 L${W} 812`} />
      </g>
    </svg>
  )
}
