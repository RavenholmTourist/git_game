import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3
const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

type Point = { x: number; y: number }
const touchDist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
const touchMid = (t: TouchList): Point => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 })

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" />
    </svg>
  )
}

export function MatrixFrame({ toolbar, children }: { toolbar: ReactNode; children: ReactNode }) {
  const [full, setFull] = useState(false)
  const [zoomPct, setZoomPct] = useState(100)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const zoom = useRef(1)
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const lastPinch = useRef(0)

  const applyZoom = useCallback((z: number, anchor?: Point) => {
    const sc = scrollRef.current
    const ct = contentRef.current
    if (!sc || !ct) return
    const next = clamp(z)
    const rect = sc.getBoundingClientRect()
    const ax = anchor ? anchor.x - rect.left : sc.clientWidth / 2
    const ay = anchor ? anchor.y - rect.top : sc.clientHeight / 2
    const px = (sc.scrollLeft + ax) / zoom.current
    const py = (sc.scrollTop + ay) / zoom.current
    zoom.current = next
    ct.style.setProperty('zoom', String(next))
    sc.scrollLeft = px * next - ax
    sc.scrollTop = py * next - ay
    setZoomPct(Math.round(next * 100))
  }, [])

  const fit = useCallback(() => {
    const sc = scrollRef.current
    const ct = contentRef.current
    if (!sc || !ct) return
    ct.style.setProperty('zoom', '1')
    zoom.current = 1
    const z = Math.min(sc.clientWidth / ct.offsetWidth, sc.clientHeight / ct.offsetHeight, 1)
    applyZoom(z)
    sc.scrollLeft = 0
    sc.scrollTop = 0
  }, [applyZoom])

  useEffect(() => {
    if (!full) return
    const sc = scrollRef.current
    const ct = contentRef.current
    if (!sc || !ct) return
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch.current = { dist: touchDist(e.touches), zoom: zoom.current }
        e.preventDefault()
      }
    }
    const onMove = (e: TouchEvent) => {
      if (!pinch.current || e.touches.length !== 2) return
      e.preventDefault()
      applyZoom((pinch.current.zoom * touchDist(e.touches)) / pinch.current.dist, touchMid(e.touches))
      lastPinch.current = Date.now()
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current = null
    }
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      applyZoom(zoom.current * Math.exp(-e.deltaY * 0.01), { x: e.clientX, y: e.clientY })
    }
    const block = (e: Event) => e.preventDefault()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.modal-backdrop') && setFull(false)
    const opts = { passive: false } as const
    sc.addEventListener('touchstart', onStart, opts)
    sc.addEventListener('touchmove', onMove, opts)
    sc.addEventListener('touchend', onEnd)
    sc.addEventListener('touchcancel', onEnd)
    sc.addEventListener('wheel', onWheel, opts)
    document.addEventListener('gesturestart', block)
    document.addEventListener('gesturechange', block)
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    fit()
    return () => {
      sc.removeEventListener('touchstart', onStart)
      sc.removeEventListener('touchmove', onMove)
      sc.removeEventListener('touchend', onEnd)
      sc.removeEventListener('touchcancel', onEnd)
      sc.removeEventListener('wheel', onWheel)
      document.removeEventListener('gesturestart', block)
      document.removeEventListener('gesturechange', block)
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
      ct.style.removeProperty('zoom')
      zoom.current = 1
    }
  }, [full, applyZoom, fit])

  return (
    <div className={`matrix-frame ${full ? 'fullscreen' : ''}`}>
      <div className="matrix-toolbar">
        {toolbar}
        {full ? (
          <div className="zoom-controls">
            <button className="btn small" onClick={() => applyZoom(zoom.current / 1.25)} aria-label="Zoom out">
              −
            </button>
            <span className="zoom-pct">{zoomPct}%</span>
            <button className="btn small" onClick={() => applyZoom(zoom.current * 1.25)} aria-label="Zoom in">
              +
            </button>
            <button className="btn small" onClick={fit}>
              Fit
            </button>
            <button className="btn small primary" onClick={() => setFull(false)}>
              ✕ Close
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => setFull(true)}>
            <ExpandIcon /> Full screen
          </button>
        )}
      </div>
      <div
        className="matrix-scroll"
        ref={scrollRef}
        onClickCapture={(e) => {
          if (Date.now() - lastPinch.current < 400) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        <div className="matrix-zoom" ref={contentRef}>
          {children}
        </div>
      </div>
      {full && <p className="fs-hint muted">Pinch or use +/− to zoom · drag to scroll · tap a cell to log/edit</p>}
    </div>
  )
}
