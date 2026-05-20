import { useCountdown } from '../../hooks/useCountdown.js'

const SIZE = 120
const STROKE = 8
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

export default function Countdown({ startedAt, timeLimitSec, size = SIZE }) {
  const { remaining, percent } = useCountdown(startedAt, timeLimitSec)

  const dash = (percent / 100) * C
  const secs = Math.ceil(remaining)

  const color =
    percent > 50 ? '#10b981' :   // green
    percent > 20 ? '#f59e0b' :   // yellow
                   '#ef4444'     // red

  const scale = size / SIZE

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background ring */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={STROKE}
        />
        {/* Progress ring */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          style={{ transition: 'stroke-dasharray 0.25s linear, stroke 0.5s ease' }}
        />
      </svg>
      <span
        className="absolute font-bold tabular-nums"
        style={{ fontSize: 28 * scale, color }}
      >
        {secs}
      </span>
    </div>
  )
}
