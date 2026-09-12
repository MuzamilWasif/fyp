/** Ring gauge used on the action queue: severity 0–100 drawn as an arc. */
export default function SeverityDial({ value = 0, label, color = '#2DE3A7', size = 40 }) {
  const r = size * 0.4125
  const circumference = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const offset = circumference * (1 - pct / 100)

  return (
    <span className="relative shrink-0 block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1E2937" strokeWidth="3" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"
          strokeDasharray={circumference.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-micro font-semibold tnum"
            style={{ color }}>
        {label ?? Math.round(pct)}
      </span>
    </span>
  )
}
