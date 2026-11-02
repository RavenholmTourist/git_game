import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  title: string
  accent: string
  revealed: boolean
  locked?: boolean
  lockedHint?: string
  onReveal: () => void
  children: ReactNode
}

const CLEAR_THRESHOLD = 0.45
const TAP_MAX_MOVE = 10
const TAP_MAX_MS = 350

function resolveColor(el: HTMLElement, color: string) {
  const m = color.match(/^var\((--[\w-]+)\)$/)
  return m ? getComputedStyle(el).getPropertyValue(m[1]).trim() || '#ffffff' : color
}

function paintCover(canvas: HTMLCanvasElement, accent: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width: w, height: h } = canvas
  ctx.globalCompositeOperation = 'source-over'
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#9c9cab')
  g.addColorStop(0.35, '#e9e9f1')
  g.addColorStop(0.5, '#8b8b9a')
  g.addColorStop(0.7, '#d6d6e0')
  g.addColorStop(1, '#a4a4b3')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < (w * h) / 60; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '40,40,55'},${Math.random() * 0.18})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2)
  }
  ctx.strokeStyle = accent
  ctx.lineWidth = w * 0.025
  ctx.strokeRect(w * 0.06, h * 0.05, w * 0.88, h * 0.9)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = accent
  ctx.font = `${Math.round(h * 0.42)}px 'Bebas Neue', Impact, sans-serif`
  ctx.fillText('?', w / 2, h * 0.44)
  ctx.fillStyle = '#2a2a38'
  ctx.font = `${Math.round(h * 0.085)}px 'Bebas Neue', Impact, sans-serif`
  ctx.fillText('SCRATCH OR TAP', w / 2, h * 0.8)
}

function clearedFraction(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let clear = 0
  let total = 0
  for (let i = 3; i < data.length; i += 4 * 16) {
    total++
    if (data[i] === 0) clear++
  }
  return clear / total
}

export function ScratchCard({ title, accent, revealed, locked, lockedHint, onReveal, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; y: number; moved: number; start: number; strokes: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(canvas.offsetWidth * dpr)
    canvas.height = Math.round(canvas.offsetHeight * dpr)
    const color = resolveColor(canvas, accent)
    paintCover(canvas, color)
    document.fonts?.ready.then(() => {
      if (!drag.current) paintCover(canvas, color)
    })
  }, [accent])

  const reveal = () => {
    if (revealed || locked) return
    navigator.vibrate?.([30, 40, 80])
    onReveal()
  }

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
      scale: canvas.width / rect.width,
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (revealed || locked) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toCanvas(e)
    drag.current = { x: p.x, y: p.y, moved: 0, start: performance.now(), strokes: 0 }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (!d || revealed || locked) return
    const canvas = e.currentTarget
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const p = toCanvas(e)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = canvas.width * 0.16
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    d.moved += Math.hypot(p.x - d.x, p.y - d.y) / p.scale
    d.x = p.x
    d.y = p.y
    if (++d.strokes % 8 === 0 && clearedFraction(canvas) >= CLEAR_THRESHOLD) {
      drag.current = null
      reveal()
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const isTap = d.moved < TAP_MAX_MOVE && performance.now() - d.start < TAP_MAX_MS
    if (isTap || clearedFraction(e.currentTarget) >= CLEAR_THRESHOLD) reveal()
  }

  const cls = ['scratch-card', revealed ? 'revealed' : '', locked ? 'locked' : ''].join(' ')
  return (
    <div className="scratch-slot">
      <span className="scratch-title" style={{ color: accent }}>
        {title}
      </span>
      <div className={cls} style={{ '--accent': accent } as React.CSSProperties}>
        <div className="scratch-content" aria-hidden={!revealed}>
          {children}
        </div>
        <canvas
          ref={canvasRef}
          className="scratch-cover"
          role="button"
          aria-label={locked ? lockedHint : `Reveal ${title}`}
          tabIndex={revealed || locked ? -1 : 0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && reveal()}
        />
        {locked && <div className="scratch-lock">🔒 {lockedHint}</div>}
        <div className="scratch-flash" />
      </div>
    </div>
  )
}

export function CharacterFace({ id, label, game, name, portrait }: {
  id: string
  label: string
  game: string
  name: string
  portrait: string
}) {
  return (
    <>
      <img src={portrait} alt={label} data-id={id} className="scratch-portrait" />
      <span className={`game-tag game-${game.toLowerCase()}`}>{game}</span>
      <span className="scratch-name">{name}</span>
    </>
  )
}
