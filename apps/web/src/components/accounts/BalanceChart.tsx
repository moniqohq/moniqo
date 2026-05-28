'use client'

import { useId } from 'react'

export interface ChartPoint { month: string; value: number }

interface Props { data: ChartPoint[] }

export function BalanceChart({ data }: Props) {
  const uid = useId().replace(/:/g, '')

  if (data.length < 2) return null

  const W = 400
  const H = 100
  const PAD = { top: 8, right: 8, bottom: 20, left: 8 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top  - PAD.bottom

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * iW
  const toY = (v: number) => PAD.top  + iH - ((v - min) / range) * iH

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value), ...d }))

  /* smooth cubic bezier path — horizontal tangents at each point */
  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
    const prev = pts[i - 1]
    const dx = (pt.x - prev.x) / 3
    return (
      acc +
      ` C ${(prev.x + dx).toFixed(1)},${prev.y.toFixed(1)}` +
      ` ${(pt.x  - dx).toFixed(1)},${pt.y.toFixed(1)}` +
      ` ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
    )
  }, '')

  const first = pts[0]
  const last  = pts[pts.length - 1]
  const areaPath =
    `${linePath}` +
    ` L ${last.x.toFixed(1)},${(PAD.top + iH).toFixed(1)}` +
    ` L ${first.x.toFixed(1)},${(PAD.top + iH).toFixed(1)} Z`

  const gradId  = `bg-${uid}`
  const glowId  = `glow-${uid}`
  const clipId  = `clip-${uid}`

  return (
    <div className="w-full" style={{ height: 100 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6C3AED" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6C3AED" stopOpacity="0.02" />
          </linearGradient>
          <filter id={glowId} x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={iW} height={iH} />
          </clipPath>
        </defs>

        {/* Subtle grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line
            key={f}
            x1={PAD.left} y1={PAD.top + iH * f}
            x2={PAD.left + iW} y2={PAD.top + iH * f}
            stroke="#1A2540" strokeWidth="0.5" strokeDasharray="3 4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Glow line (thicker, blurred) */}
        <path
          d={linePath}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="3"
          filter={`url(#${glowId})`}
          opacity="0.5"
        />

        {/* Main neon line */}
        <path
          d={linePath}
          fill="none"
          stroke="#A78BFA"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data dots */}
        {pts.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="3.5" fill="#0B1120" stroke="#7C3AED" strokeWidth="1.5" />
            <circle cx={pt.x} cy={pt.y} r="1.5" fill="#A78BFA" />
          </g>
        ))}

        {/* Month labels */}
        {pts.map((pt, i) => (
          <text
            key={i}
            x={pt.x}
            y={H - 3}
            textAnchor="middle"
            fontSize="8"
            fill="#3A4A60"
            fontFamily="system-ui, sans-serif"
          >
            {pt.month}
          </text>
        ))}
      </svg>
    </div>
  )
}
