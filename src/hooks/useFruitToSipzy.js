import { useEffect } from 'react'
import { fruitFlavours as flavours } from '../data/fruitFlavours'

/**
 * Port of vanilla From fruit to Sipzy scroll-scrub storytelling (app.js).
 * Operates on DOM inside sectionRef (must contain vanilla data-* hooks).
 */
export function useFruitToSipzy(sectionRef) {
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const sticky = section.querySelector('.fts-sticky')
    const spacer = section.querySelector('[data-fts-spacer]')
    const fruitEl = section.querySelector('[data-fts-fruit]')
    const fruitImg = section.querySelector('[data-fts-fruit-img]')
    const nextEl = section.querySelector('[data-fts-next]')
    const nextImg = section.querySelector('[data-fts-next-img]')
    const bottleEl = section.querySelector('[data-fts-bottle]')
    const bottleImg = section.querySelector('[data-fts-bottle-img]')
    const fragEls = [...section.querySelectorAll('[data-fts-frag]')]
    const openerEl = section.querySelector('[data-fts-opener]')
    const phaseEl = section.querySelector('[data-fts-phase]')
    const revealEl = section.querySelector('[data-fts-reveal]')
    const nameEl = section.querySelector('[data-fts-name]')
    const metaEl = section.querySelector('[data-fts-meta]')
    const lineEl = section.querySelector('[data-fts-line]')
    const blurbEl = section.querySelector('[data-fts-blurb]')
    const liveEl = section.querySelector('[data-fts-live]')

    if (
      !sticky ||
      !spacer ||
      !fruitEl ||
      !fruitImg ||
      !nextEl ||
      !nextImg ||
      !bottleEl ||
      !bottleImg ||
      !openerEl ||
      !phaseEl ||
      !revealEl ||
      !nameEl ||
      !metaEl ||
      !lineEl ||
      !liveEl
    ) {
      return undefined
    }

    const compactQuery = window.matchMedia('(max-width: 768px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const COUNT = flavours.length
    const ROT_DIR = [1, -1, 1, -1, 1, -1]
    const preloaded = new Set()
    let activeIndex = -1
    let ticking = false
    let inView = false
    let rafId = 0
    let alive = true

    function clamp01(n) {
      return n < 0 ? 0 : n > 1 ? 1 : n
    }

    function remap(t, a, b) {
      if (b === a) return t >= b ? 1 : 0
      return clamp01((t - a) / (b - a))
    }

    function lerp(a, b, t) {
      return a + (b - a) * t
    }

    function easeOutCubic(t) {
      return 1 - (1 - t) ** 3
    }

    function easeInCubic(t) {
      return t * t * t
    }

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
    }

    function hexToRgb(hex) {
      const n = parseInt(hex.slice(1), 16)
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    }

    function preload(src) {
      if (!src || preloaded.has(src)) return
      preloaded.add(src)
      const img = new Image()
      img.decoding = 'async'
      img.src = src
    }

    function setSrc(img, src) {
      if (img && src && img.getAttribute('src') !== src) img.src = src
    }

    function sectionProgress() {
      const total = sticky.offsetHeight + spacer.offsetHeight - window.innerHeight
      const scrolled = -section.getBoundingClientRect().top
      return clamp01(scrolled / Math.max(1, total))
    }

    function splitProgress(progress) {
      const scaled = progress * COUNT
      const index = Math.min(COUNT - 1, Math.floor(scaled))
      return { index, t: clamp01(scaled - index) }
    }

    function applyTransform(el, x, y, scale, rot, opacity) {
      el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) rotate(${rot}deg) scale(${scale})`
      el.style.opacity = String(opacity)
    }

    function pulseReveal(el, amount, shift = true) {
      if (!el) return
      const p = clamp01(amount)
      el.style.opacity = p <= 0.01 ? '0' : '1'
      el.style.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`
      if (shift) el.style.transform = `translateY(${(1 - p) * 16}px)`
    }

    function vortexPose(i, p, motion, compact) {
      const dist = compact ? 0.5 : 1
      const base = (i / 6) * Math.PI * 2 - Math.PI / 2
      const burst = (108 + (i % 3) * 26) * motion.burst * dist
      const spin =
        base + p * Math.PI * 2 * motion.orbit + i * 0.22 * motion.spiral * p * Math.PI * 2
      const radius = burst * (1.04 + 0.36 * Math.sin(p * Math.PI))
      const extra = Math.max(0, motion.burst - 1) * 56 * p * dist
      const jx = Math.sin(p * 17 + i * 2.1) * motion.jitter * 12 * dist
      const jy = Math.cos(p * 15 + i * 2.6) * motion.jitter * 12 * dist
      return {
        x:
          Math.cos(spin) * (radius + extra) +
          jx +
          motion.driftX * 46 * Math.sin(p * Math.PI) * dist,
        y:
          Math.sin(spin) * (radius + extra) +
          jy +
          motion.driftY * 22 * Math.cos(p * Math.PI) * dist,
        rot: ROT_DIR[i] * (18 + p * 36),
        scale: 0.9 + 0.12 * Math.sin(p * Math.PI),
      }
    }

    function fragPose(i, t, motion, compact) {
      const start = vortexPose(i, 0, motion, compact)
      const swirl = vortexPose(i, 1, motion, compact)
      let x = 0
      let y = 0
      let rot = 0
      let scale = 1
      let opacity = 0

      if (t < 0.1) {
        opacity = 0
      } else if (t < 0.28) {
        const appear = remap(t, 0.1, 0.14)
        const p = easeOutCubic(remap(t, 0.12, 0.28))
        x = start.x * p
        y = start.y * p
        rot = start.rot * p
        scale = lerp(1.08, start.scale, p)
        opacity = appear
      } else if (t < 0.48) {
        const p = remap(t, 0.28, 0.48)
        const pose = vortexPose(i, p, motion, compact)
        x = pose.x
        y = pose.y
        rot = pose.rot
        scale = pose.scale
        opacity = 1
      } else if (t < 0.68) {
        const p = easeInOutCubic(remap(t, 0.48, 0.68))
        x = lerp(swirl.x, 0, p)
        y = lerp(swirl.y, 0, p)
        rot = lerp(swirl.rot, 0, p)
        scale = lerp(swirl.scale, 0.42, p)
        opacity = lerp(1, i % 2 === 0 ? 0.08 : 0.28, p)
      } else if (t < 0.82) {
        const p = remap(t, 0.68, 0.82)
        opacity = lerp(i % 2 === 0 ? 0.08 : 0.28, 0, p)
        scale = lerp(0.42, 0.28, p)
      } else {
        opacity = 0
        scale = 0.28
      }

      return { x, y, rot, scale, opacity }
    }

    function bottlePose(t, motion, compact, last) {
      const dist = compact ? 0.55 : 1
      if (t < 0.48) {
        return { x: 0, y: 32 * dist, rot: -7, scale: 0.75, opacity: 0, blur: compact ? 0 : 10 }
      }
      if (t < 0.68) {
        const p = easeOutCubic(remap(t, 0.48, 0.68))
        return {
          x: 0,
          y: lerp(32 * dist, 0, p),
          rot: lerp(-7, 0, p),
          scale: lerp(0.75, 1, p),
          opacity: p,
          blur: compact ? 0 : lerp(10, 0, p),
        }
      }
      if (t < 0.82 || last) {
        return { x: 0, y: 0, rot: 0, scale: 1, opacity: 1, blur: 0 }
      }
      const p = easeInCubic(remap(t, 0.82, 1))
      return {
        x: motion.exit * 170 * dist * p,
        y: lerp(0, 28 * dist, p),
        rot: motion.exit * 10 * p,
        scale: lerp(1, 0.56, p),
        opacity: 1 - p,
        blur: 0,
      }
    }

    function nextFruitPose(t, motion, compact, hasNext) {
      if (!hasNext || t < 0.82) {
        return { x: -motion.exit * 140, y: 24, scale: 0.72, opacity: 0 }
      }
      const p = easeOutCubic(remap(t, 0.82, 1))
      const dist = compact ? 0.55 : 1
      return {
        x: lerp(-motion.exit * 160 * dist, 0, p),
        y: lerp(28 * dist, 0, p),
        scale: lerp(0.72, 1, p),
        opacity: p,
      }
    }

    function fruitPose(t, compact) {
      const peak = compact ? 1.04 : 1.06
      const end = compact ? 1.08 : 1.12
      if (t < 0.12) {
        return { scale: lerp(1, peak, remap(t, 0, 0.12)), opacity: 1 }
      }
      const p = remap(t, 0.12, 0.22)
      return { scale: lerp(peak, end, p), opacity: 1 - easeInCubic(p) }
    }

    function copyPulses(index, t) {
      const first = index === 0
      const last = index === COUNT - 1
      const compact = compactQuery.matches
      const opener = first ? 1 - remap(t, 0.07, 0.14) : 0
      const phase = compact ? 0 : remap(t, 0.08, 0.13) * (1 - remap(t, 0.2, 0.27))
      const reveal = remap(t, 0.66, 0.74) * (last ? 1 : 1 - remap(t, 0.86, 0.96))
      const blurb = remap(t, 0.7, 0.78) * (last ? 1 : 1 - remap(t, 0.86, 0.96))
      return { opener, phase, reveal, blurb }
    }

    function reducedPulses(index, t) {
      const first = index === 0
      return {
        opener: first ? 1 - remap(t, 0.12, 0.28) : 0,
        phase: 0,
        reveal: remap(t, 0.42, 0.58),
        blurb: remap(t, 0.46, 0.62),
      }
    }

    function applyFlavour(index) {
      const flavour = flavours[index]
      const next = flavours[index + 1]
      setSrc(fruitImg, flavour.fruit)
      setSrc(bottleImg, flavour.bottle)
      fragEls.forEach((frag) => {
        const img = frag.querySelector('img')
        setSrc(img, flavour.fruit)
      })
      if (next) {
        setSrc(nextImg, next.fruit)
        preload(next.bottle)
      }
      nameEl.textContent = flavour.name
      metaEl.textContent = flavour.meta
      lineEl.textContent = flavour.line
      if (blurbEl) blurbEl.textContent = flavour.description
      liveEl.textContent = `${flavour.name}. ${flavour.meta}. ${flavour.description}`
      preload(flavour.fruit)
      preload(flavour.bottle)
    }

    function tint(index, t) {
      const current = hexToRgb(flavours[index].accent)
      const following = flavours[index + 1]
        ? hexToRgb(flavours[index + 1].accent)
        : current
      const mix = remap(t, 0.78, 1)
      const r = Math.round(lerp(current.r, following.r, mix))
      const g = Math.round(lerp(current.g, following.g, mix))
      const b = Math.round(lerp(current.b, following.b, mix))
      section.style.setProperty('--fts-accent', `${r}, ${g}, ${b}`)
    }

    function paint() {
      ticking = false
      rafId = 0
      if (!alive) return
      const progress = sectionProgress()
      const { index, t } = splitProgress(progress)
      const compact = compactQuery.matches
      const flavour = flavours[index]
      const last = index === COUNT - 1

      if (index !== activeIndex) {
        applyFlavour(index)
        activeIndex = index
      }

      if (t > 0.55 && flavours[index + 1]) {
        preload(flavours[index + 1].fruit)
        preload(flavours[index + 1].bottle)
      }

      tint(index, t)
      bottleEl.classList.toggle('is-settled', t >= 0.68 && (t < 0.82 || last))

      if (reduced.matches) {
        const fruitOpacity = 1 - remap(t, 0.28, 0.58)
        const bottleOpacity =
          remap(t, 0.32, 0.62) * (last ? 1 : 1 - remap(t, 0.82, 1))
        const nextOpacity = last ? 0 : remap(t, 0.82, 1)
        applyTransform(fruitEl, 0, 0, lerp(1, 0.92, remap(t, 0.28, 0.62)), 0, fruitOpacity)
        applyTransform(
          bottleEl,
          0,
          lerp(18, 0, remap(t, 0.32, 0.66)),
          lerp(0.86, 1, remap(t, 0.32, 0.66)),
          0,
          bottleOpacity,
        )
        bottleEl.style.filter = 'none'
        applyTransform(nextEl, 0, 0, lerp(0.86, 1, nextOpacity), 0, nextOpacity)
        fragEls.forEach((frag) => {
          frag.style.opacity = '0'
        })
        const pulses = reducedPulses(index, t)
        pulseReveal(openerEl, pulses.opener)
        pulseReveal(phaseEl, pulses.phase)
        pulseReveal(revealEl, pulses.reveal)
        pulseReveal(blurbEl, pulses.blurb, false)
        return
      }

      const fruit = fruitPose(t, compact)
      const bottle = bottlePose(t, flavour.motion, compact, last)
      const incoming = nextFruitPose(
        t,
        flavour.motion,
        compact,
        Boolean(flavours[index + 1]),
      )
      const fragCount = compact ? 3 : 6
      const pulses = copyPulses(index, t)

      applyTransform(fruitEl, 0, 0, fruit.scale, 0, fruit.opacity)
      applyTransform(bottleEl, bottle.x, bottle.y, bottle.scale, bottle.rot, bottle.opacity)
      bottleEl.style.filter = bottle.blur > 0.35 ? `blur(${bottle.blur}px)` : 'none'
      bottleEl.style.zIndex = t >= 0.52 ? '4' : '2'
      applyTransform(nextEl, incoming.x, incoming.y, incoming.scale, 0, incoming.opacity)

      fragEls.forEach((frag, i) => {
        if (i >= fragCount) {
          frag.style.opacity = '0'
          return
        }
        const pose = fragPose(i, t, flavour.motion, compact)
        applyTransform(frag, pose.x, pose.y, pose.scale, pose.rot, pose.opacity)
        frag.style.zIndex = t >= 0.52 ? '1' : '3'
      })

      pulseReveal(openerEl, pulses.opener)
      pulseReveal(phaseEl, pulses.phase)
      pulseReveal(revealEl, pulses.reveal)
      pulseReveal(blurbEl, pulses.blurb, false)
    }

    function requestPaint() {
      if (ticking || !alive) return
      ticking = true
      rafId = requestAnimationFrame(paint)
    }

    function applyReducedClass() {
      if (!alive) return
      section.classList.toggle('is-reduced', reduced.matches)
      requestPaint()
    }

    const viewObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!alive) return
          inView = entry.isIntersecting
          section.classList.toggle('is-hot', inView && !reduced.matches)
          if (inView) requestPaint()
        })
      },
      { rootMargin: '20% 0px' },
    )

    function onScroll() {
      if (
        inView ||
        Math.abs(section.getBoundingClientRect().top) < window.innerHeight * 1.2
      ) {
        requestPaint()
      }
    }

    viewObserver.observe(section)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', requestPaint)
    compactQuery.addEventListener('change', requestPaint)
    reduced.addEventListener('change', applyReducedClass)

    applyFlavour(0)
    applyReducedClass()
    requestPaint()

    return () => {
      alive = false
      if (rafId) cancelAnimationFrame(rafId)
      viewObserver.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', requestPaint)
      compactQuery.removeEventListener('change', requestPaint)
      reduced.removeEventListener('change', applyReducedClass)
    }
  }, [sectionRef])
}
