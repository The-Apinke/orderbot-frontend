'use client'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

function weightedColor() {
  const r = Math.random()
  if (r < 0.05) return '#fff5e0'
  if (r < 0.22) return '#ffcc00'
  if (r < 0.52) return '#ff6b00'
  return '#ff4500'
}

function drawRoundRect(ctx, x, y, w, h, r) {
  const s = Math.min(r, Math.abs(h) / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + s, y)
  ctx.lineTo(x + w - s, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + s)
  ctx.lineTo(x + w, y + h - s)
  ctx.quadraticCurveTo(x + w, y + h, x + w - s, y + h)
  ctx.lineTo(x + s, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - s)
  ctx.lineTo(x, y + s)
  ctx.quadraticCurveTo(x, y, x + s, y)
  ctx.closePath()
}

class Ember {
  constructor(W, H, spreadInitially) {
    this.W = W
    this.H = H
    this._spawn(spreadInitially)
  }

  _spawn(initial) {
    this.x = Math.random() * this.W
    this.y = initial
      ? Math.random() * this.H
      : this.H + Math.random() * 30
    this.vy = -(28 + Math.random() * 60)
    this.vx = (Math.random() - 0.5) * 12
    this.color = weightedColor()
    this.size = 0.6 + Math.random() * 2.4
    this.life = 0.6 + Math.random() * 0.4
    this.lifeDecay = (this.color === '#fff5e0' ? 0.18 : 0.06) + Math.random() * 0.12
    this.wobbleAmp = 3 + Math.random() * 10
    this.wobbleFreq = 0.8 + Math.random() * 2.4
    this.wobblePhase = Math.random() * Math.PI * 2
    this.age = 0
  }

  update(dt, pulse) {
    const speed = 1 + pulse * 2.8
    this.age += dt
    this.x += (this.vx + Math.sin(this.age * this.wobbleFreq + this.wobblePhase) * 0.8) * dt
    this.y += this.vy * speed * dt
    this.life -= this.lifeDecay * (1 + pulse * 0.8) * dt
    if (this.life <= 0 || this.y < -12) this._spawn(false)
  }

  draw(ctx, pulse) {
    if (this.life <= 0) return
    const alpha = Math.min(1, this.life * (1 + pulse * 0.4))
    const r = this.size * (1 + pulse * 0.25)
    const isHot = this.color === '#fff5e0' || this.color === '#ffcc00'
    ctx.save()
    ctx.globalAlpha = alpha
    if (isHot || pulse > 0.35) {
      ctx.shadowColor = this.color
      ctx.shadowBlur = (isHot ? 8 : 4) + pulse * 10
    }
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

class Skewer {
  constructor(W, H, index) {
    this.W = W
    this.H = H
    this.progress = 0

    const layouts = [
      { yFrac: 0.58, angle: -0.17, lengthFrac: 0.72, meatCount: 5 },
      { yFrac: 0.66, angle: -0.13, lengthFrac: 0.68, meatCount: 4 },
      { yFrac: 0.74, angle: -0.20, lengthFrac: 0.65, meatCount: 5 },
    ]
    const l = layouts[index]
    this.startY = H * l.yFrac
    this.angle = l.angle
    this.length = W * l.lengthFrac
    this.delay = index * 0.04

    this.meat = Array.from({ length: l.meatCount }, (_, i) => ({
      t: (i + 1) / (l.meatCount + 1),
      w: 8 + ((i * 3.7 + index * 2.1) % 5),
      h: 7 + ((i * 1.9) % 3),
    }))
  }

  setProgress(raw) {
    this.progress = Math.max(0, Math.min(1, raw - this.delay))
  }

  draw(ctx) {
    if (this.progress <= 0) return

    const visLen = this.length * this.progress
    const sx = -this.W * 0.08
    const sy = this.startY

    ctx.save()

    // Stick
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(this.angle) * visLen, sy + Math.sin(this.angle) * visLen)
    ctx.strokeStyle = 'rgba(160, 90, 25, 0.55)'
    ctx.lineWidth = 1.8
    ctx.shadowColor = 'rgba(255, 100, 0, 0.2)'
    ctx.shadowBlur = 4
    ctx.stroke()

    // Meat chunks
    for (const m of this.meat) {
      if (m.t > this.progress * 1.1) break

      const mx = sx + Math.cos(this.angle) * (visLen * m.t / this.progress)
      const my = sy + Math.sin(this.angle) * (visLen * m.t / this.progress)

      ctx.save()
      ctx.translate(mx, my)
      ctx.rotate(this.angle)

      ctx.shadowColor = '#ff6b00'
      ctx.shadowBlur = 14

      ctx.fillStyle = '#7a2e08'
      drawRoundRect(ctx, -m.w / 2, -m.h / 2, m.w, m.h, 2)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255, 120, 30, 0.35)'
      drawRoundRect(ctx, -m.w / 2, -m.h / 2, m.w, m.h * 0.45, 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      drawRoundRect(ctx, -m.w / 2 + 2, -m.h / 2 + 2, 1.5, m.h - 4, 1)
      ctx.fill()
      drawRoundRect(ctx, -m.w / 2 + 5.5, -m.h / 2 + 1, 1.5, m.h - 2, 1)
      ctx.fill()

      ctx.restore()
    }

    ctx.restore()
  }
}

class AnimationController {
  constructor(canvas, ctx, dpr, W, H) {
    this.canvas = canvas
    this.ctx = ctx
    this.dpr = dpr
    this.W = W
    this.H = H
    this.time = 0
    this.prevTime = 0

    this.isPulsing = false
    this.pulseStart = 0
    this.nextPulseTime = 0.18 + Math.random() * 0.1

    const count = W < 500 ? 160 : W < 900 ? 220 : 300
    this.embers = Array.from({ length: count }, () => new Ember(W, H, true))
    this.skewers = [0, 1, 2].map(i => new Skewer(W, H, i))

    this._buildTimeline()
  }

  _buildTimeline() {
    this.tl = gsap.timeline({ repeat: -1 })
    this.tl.to(this, {
      time: 1,
      duration: 15,
      ease: 'none',
      onUpdate: () => this._render(),
    })
  }

  _pulseValue() {
    if (!this.isPulsing && this.time >= this.nextPulseTime) {
      this.isPulsing = true
      this.pulseStart = this.time
      this.nextPulseTime = this.time + 0.23 + Math.random() * 0.1
    }
    if (this.isPulsing) {
      const elapsed = (this.time - this.pulseStart) * 15
      if (elapsed >= 2) { this.isPulsing = false; return 0 }
      return Math.sin((elapsed / 2) * Math.PI) * 0.85
    }
    return 0
  }

  _drawBackground() {
    this.ctx.fillStyle = '#1a0a00'
    this.ctx.fillRect(0, 0, this.W, this.H)
  }

  _drawSmoke() {
    const ctx = this.ctx
    const base = ctx.createLinearGradient(0, this.H, 0, this.H * 0.6)
    base.addColorStop(0, 'rgba(45, 28, 10, 0.35)')
    base.addColorStop(0.6, 'rgba(35, 18, 5, 0.12)')
    base.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = base
    ctx.fillRect(0, this.H * 0.6, this.W, this.H * 0.4)

    const py = this.H * 0.78 + Math.sin(this.time * Math.PI * 3.2) * 14
    const sg = ctx.createRadialGradient(this.W / 2, py, 0, this.W / 2, py, this.W * 0.55)
    sg.addColorStop(0, 'rgba(55, 35, 15, 0.09)')
    sg.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = sg
    ctx.fillRect(0, 0, this.W, this.H)
  }

  _drawPulseGlow(pulse) {
    if (pulse < 0.05) return
    const ctx = this.ctx
    ctx.fillStyle = `rgba(255, 70, 0, ${pulse * 0.045})`
    ctx.fillRect(0, 0, this.W, this.H)
    const grd = ctx.createRadialGradient(this.W / 2, this.H * 1.1, 0, this.W / 2, this.H * 1.1, this.H * 0.85)
    grd.addColorStop(0, `rgba(255, 140, 0, ${pulse * 0.18})`)
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, this.W, this.H)
  }

  _render() {
    const rawDt = this.time - this.prevTime
    this.prevTime = this.time
    const dt = rawDt < 0 ? 0 : Math.min(rawDt, 0.05)

    if (rawDt < -0.5) {
      this.nextPulseTime = 0.18 + Math.random() * 0.1
      this.isPulsing = false
    }

    const pulse = this._pulseValue()

    this._drawBackground()
    this._drawSmoke()

    for (const e of this.embers) {
      e.update(dt, pulse)
      e.draw(this.ctx, pulse)
    }

    if (this.time > 0.133) {
      const raw = (this.time - 0.133) / 0.09
      for (const s of this.skewers) {
        s.setProgress(raw)
        s.draw(this.ctx)
      }
    }

    this._drawPulseGlow(pulse)
  }

  destroy() { this.tl?.kill() }
}

export function SuyaAnimation() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const update = () => setDims({ width: window.innerWidth, height: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (dims.width === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = dims.width * dpr
    canvas.height = dims.height * dpr
    canvas.style.width = `${dims.width}px`
    canvas.style.height = `${dims.height}px`
    ctx.scale(dpr, dpr)

    animRef.current = new AnimationController(canvas, ctx, dpr, dims.width, dims.height)
    return () => { animRef.current?.destroy(); animRef.current = null }
  }, [dims])

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
