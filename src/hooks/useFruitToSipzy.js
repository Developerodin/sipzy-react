import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { fruitFlavours as flavours } from '../data/fruitFlavours'
import { useScroll } from '../context/ScrollContext'
import {
  encodeAssetUrl,
  preloadAllFruitFlavours,
  preloadImage,
} from '../lib/preloadAssets'

gsap.registerPlugin(ScrollTrigger)

/** Local flavour progress where bottle + copy are fully settled. */
const SETTLED_T = 0.78
const HOLD_MS = 2000
const INTRO_DURATION = 1.35
const EXIT_DURATION = 0.55
const RESUME_HOLD_MS = 900
const STEP_COOLDOWN_MS = 420
const WHEEL_UNLOCK_Y = 18
const WHEEL_STEP_X = 28
/** Max px section top may drift from viewport top while locked. */
const ALIGN_TOLERANCE_PX = 12
/** Soft-snap + lock only after section is ≥50% revealed. */
const HALF_REVEAL = 0.5
/** After unlock, suppress fruit snap so soft-snap cannot re-lock. */
const SNAP_SUPPRESS_MS = 500
/** Max rAF frames spent aligning to section top before lock finishes. */
const ALIGN_MAX_FRAMES = 12
/** Watchdog: restart loop if lock stalls with no tween/hold. */
const LOOP_WATCHDOG_MS = 700

/**
 * From fruit to Sipzy — viewport lock + timed fruit→break→bottle loop.
 * Horizontal prev/next; vertical unlock; press-hold pauses.
 */
export function useFruitToSipzy(sectionRef) {
  const {
    lenisRef,
    scrollTo,
    registerSectionSnapTarget,
    registerSnapPoints,
    interruptSoftSnap,
  } = useScroll()

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const stageEl = section.querySelector('[data-fts-stage]')
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
    let activeIndex = -1
    let alive = true
    let assetsReady = false
    let locked = false
    let held = false
    let pendingFlavour = null
    let tween = null
    let holdTimer = 0
    let stepCoolUntil = 0
    let loopIndex = 0
    let currentT = 0
    let pinTrigger = null
    let touchStartX = 0
    let touchStartY = 0
    let touchActive = false
    let pendingEnterFromBelow = false
    let driftRaf = 0
    let alignRaf = 0
    let alignGeneration = 0
    let loopWatchdog = 0
    /** True while applyFlavour+intro kickoff is in flight (no tween yet). */
    let bootstrapping = false
    /** Soft-snap ignored until this timestamp (post-unlock escape). */
    let snapSuppressUntil = 0

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

    function setSrc(img, src) {
      if (!img || !src) return
      const encoded = encodeAssetUrl(src)
      if (img.getAttribute('src') !== encoded && img.getAttribute('src') !== src) {
        img.src = encoded
      }
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

    function bottlePose(t, motion, compact) {
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
      if (t < 0.82) {
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

    function nextFruitPose(t, motion, compact) {
      if (t < 0.82) {
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
      const compact = compactQuery.matches
      const opener = first ? 1 - remap(t, 0.07, 0.14) : 0
      const phase = compact ? 0 : remap(t, 0.08, 0.13) * (1 - remap(t, 0.2, 0.27))
      // Infinite loop: always fade copy on exit (never a terminal flavour).
      const reveal = remap(t, 0.66, 0.74) * (1 - remap(t, 0.86, 0.96))
      const blurb = remap(t, 0.7, 0.78) * (1 - remap(t, 0.86, 0.96))
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

    async function applyFlavour(index) {
      const flavour = flavours[index]
      const next = flavours[(index + 1) % COUNT]
      const token = { index }
      pendingFlavour = token

      setSrc(fruitImg, flavour.fruit)
      setSrc(bottleImg, flavour.bottle)
      fragEls.forEach((frag) => {
        const img = frag.querySelector('img')
        setSrc(img, flavour.fruit)
      })
      setSrc(nextImg, next.fruit)
      preloadImage(next.bottle).catch(() => {})

      nameEl.textContent = flavour.name
      metaEl.textContent = flavour.meta
      lineEl.textContent = flavour.line
      if (blurbEl) blurbEl.textContent = flavour.description
      liveEl.textContent = `${flavour.name}. ${flavour.meta}. ${flavour.description}`

      try {
        await Promise.all([
          preloadImage(flavour.fruit),
          preloadImage(flavour.bottle),
          preloadImage(next.fruit),
        ])
      } catch {
        // Continue with whatever loaded.
      }

      if (!alive || pendingFlavour !== token) return false
      activeIndex = index
      return true
    }

    function tint(index, t) {
      const current = hexToRgb(flavours[index].accent)
      const following = hexToRgb(flavours[(index + 1) % COUNT].accent)
      const mix = remap(t, 0.78, 1)
      const r = Math.round(lerp(current.r, following.r, mix))
      const g = Math.round(lerp(current.g, following.g, mix))
      const b = Math.round(lerp(current.b, following.b, mix))
      section.style.setProperty('--fts-accent', `${r}, ${g}, ${b}`)
    }

    function paintFlavourFrame(index, t) {
      if (!alive) return
      currentT = t
      const compact = compactQuery.matches
      const flavour = flavours[index]

      tint(index, t)
      bottleEl.classList.toggle('is-settled', t >= 0.68 && t < 0.82)

      if (reduced.matches) {
        const fruitOpacity = 1 - remap(t, 0.28, 0.58)
        const bottleOpacity = remap(t, 0.32, 0.62)
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
        applyTransform(nextEl, 0, 0, 0.86, 0, 0)
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
      const bottle = bottlePose(t, flavour.motion, compact)
      const incoming = nextFruitPose(t, flavour.motion, compact)
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

    function paintSeed() {
      tint(0, 0)
      applyTransform(fruitEl, 0, 0, 1, 0, 1)
      applyTransform(bottleEl, 0, 32, 0.75, -7, 0)
      bottleEl.style.filter = 'none'
      applyTransform(nextEl, 0, 24, 0.72, 0, 0)
      fragEls.forEach((frag) => {
        frag.style.opacity = '0'
      })
      pulseReveal(openerEl, 1)
      pulseReveal(phaseEl, 0)
      pulseReveal(revealEl, 0)
      pulseReveal(blurbEl, 0, false)
      bottleEl.classList.remove('is-settled')
    }

    function killTween() {
      if (tween) {
        tween.kill()
        tween = null
      }
    }

    function clearHold() {
      if (holdTimer) {
        window.clearTimeout(holdTimer)
        holdTimer = 0
      }
    }

    function stopLoopMotion() {
      killTween()
      clearHold()
      bootstrapping = false
    }

    function animateT(from, to, duration, ease, onComplete) {
      killTween()
      const state = { t: from }
      tween = gsap.to(state, {
        t: to,
        duration,
        ease,
        onUpdate: () => {
          if (!alive) return
          paintFlavourFrame(loopIndex, state.t)
        },
        onComplete: () => {
          tween = null
          if (!alive) return
          onComplete?.()
        },
      })
    }

    function scheduleHold(ms = HOLD_MS) {
      clearHold()
      if (held || !locked || !alive) return
      holdTimer = window.setTimeout(() => {
        holdTimer = 0
        if (!alive || held || !locked) return
        advanceToNext()
      }, ms)
    }

    /** If the loop stalls with no tween and no hold, resume from settled or seed. */
    function ensureLoopAlive() {
      if (!alive || !locked || held || reduced.matches) return
      if (tween || holdTimer || bootstrapping) return
      if (currentT >= SETTLED_T - 0.02) {
        scheduleHold(HOLD_MS)
        return
      }
      // Stuck on opener/seed — restart intro for the current flavour.
      playIntro(loopIndex)
    }

    function startLoopWatchdog() {
      stopLoopWatchdog()
      loopWatchdog = window.setInterval(() => {
        ensureLoopAlive()
      }, LOOP_WATCHDOG_MS)
    }

    function stopLoopWatchdog() {
      if (loopWatchdog) {
        window.clearInterval(loopWatchdog)
        loopWatchdog = 0
      }
    }

    function playIntro(index) {
      if (bootstrapping || tween) return
      loopIndex = index
      bootstrapping = true
      applyFlavour(index)
        .then((ok) => {
          if (!ok || !alive || !locked) return
          if (reduced.matches) {
            paintFlavourFrame(index, SETTLED_T)
            return
          }
          animateT(0, SETTLED_T, INTRO_DURATION, 'power2.out', () => {
            scheduleHold(HOLD_MS)
            ensureLoopAlive()
          })
        })
        .finally(() => {
          bootstrapping = false
        })
    }

    function advanceToNext() {
      if (!locked || held || reduced.matches || bootstrapping) return
      const fromIndex = loopIndex
      animateT(currentT, 1, EXIT_DURATION, 'power2.in', () => {
        const next = (fromIndex + 1) % COUNT
        loopIndex = next
        bootstrapping = true
        applyFlavour(next)
          .then((ok) => {
            if (!ok || !alive || !locked) return
            animateT(0, SETTLED_T, INTRO_DURATION, 'power2.out', () => {
              scheduleHold(HOLD_MS)
              ensureLoopAlive()
            })
          })
          .finally(() => {
            bootstrapping = false
          })
      })
    }

    function jumpToSettled(index) {
      if (!locked || reduced.matches || bootstrapping) return
      if (performance.now() < stepCoolUntil) return
      stepCoolUntil = performance.now() + STEP_COOLDOWN_MS
      stopLoopMotion()
      loopIndex = ((index % COUNT) + COUNT) % COUNT
      bootstrapping = true
      applyFlavour(loopIndex)
        .then((ok) => {
          if (!ok || !alive || !locked) return
          paintFlavourFrame(loopIndex, SETTLED_T)
          if (!held) {
            scheduleHold(HOLD_MS)
            ensureLoopAlive()
          }
        })
        .finally(() => {
          bootstrapping = false
        })
    }

    function step(dir) {
      jumpToSettled(loopIndex + dir)
    }

    function snapSectionToTop(immediate = true) {
      const y = section.offsetTop
      const lenis = lenisRef.current
      if (lenis) {
        lenis.scrollTo(y, { immediate })
      }
      // Hard fallback so alignment sticks even if Lenis is stopped or missing.
      window.scrollTo({ top: y, behavior: 'auto' })
    }

    function isAlignedToTop() {
      return Math.abs(section.getBoundingClientRect().top) <= ALIGN_TOLERANCE_PX
    }

    /** True when ≥ half the section intersects the viewport (or mid-line crosses it). */
    function isHalfRevealed() {
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      if (rect.height <= 0) return false
      const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0)
      if (visible >= rect.height * HALF_REVEAL) return true
      return rect.top <= vh * HALF_REVEAL && rect.bottom > vh * HALF_REVEAL
    }

    function suppressFruitSnap() {
      snapSuppressUntil = performance.now() + SNAP_SUPPRESS_MS
    }

    function stopDriftGuard() {
      if (driftRaf) {
        cancelAnimationFrame(driftRaf)
        driftRaf = 0
      }
    }

    function stopAlignLoop() {
      if (alignRaf) {
        cancelAnimationFrame(alignRaf)
        alignRaf = 0
      }
    }

    function startDriftGuard() {
      stopDriftGuard()
      const tick = () => {
        if (!alive || !locked) {
          driftRaf = 0
          return
        }
        // Don't fight an in-progress unlock swipe.
        if (!touchActive && !isAlignedToTop()) {
          const y = section.offsetTop
          window.scrollTo({ top: y, behavior: 'auto' })
          lenisRef.current?.scrollTo(y, { immediate: true })
        }
        driftRaf = requestAnimationFrame(tick)
      }
      driftRaf = requestAnimationFrame(tick)
    }

    function resetExperiencePaint() {
      stopLoopMotion()
      held = false
      section.classList.remove('is-held')
      paintSeed()
      currentT = 0
      loopIndex = 0
    }

    /**
     * @param {{ fromBelow?: boolean }} [opts]
     */
    function lockSection({ fromBelow: _fromBelow = false } = {}) {
      if (!alive || locked || !assetsReady) return
      locked = true
      section.classList.add('is-locked', 'is-hot')

      // Cancel any soft-snap coast so hard snap is not fighting Lenis settle.
      interruptSoftSnap()
      resetExperiencePaint()

      const gen = ++alignGeneration
      stopAlignLoop()
      snapSectionToTop(true)

      const finishLock = () => {
        if (!alive || gen !== alignGeneration || !locked) return
        alignRaf = 0
        lenisRef.current?.stop()
        // Re-assert after stop in case Lenis ignored the earlier scrollTo.
        window.scrollTo({ top: section.offsetTop, behavior: 'auto' })
        startDriftGuard()
        startLoopWatchdog()
        playIntro(0)
      }

      let frames = 0
      const tick = () => {
        if (!alive || gen !== alignGeneration || !locked) {
          alignRaf = 0
          return
        }
        frames += 1
        if (isAlignedToTop() || frames >= ALIGN_MAX_FRAMES) {
          finishLock()
          return
        }
        snapSectionToTop(true)
        alignRaf = requestAnimationFrame(tick)
      }

      if (isAlignedToTop()) {
        finishLock()
      } else {
        alignRaf = requestAnimationFrame(tick)
      }
    }

    function forceUnlockCleanup() {
      alignGeneration += 1
      stopAlignLoop()
      locked = false
      stopDriftGuard()
      stopLoopWatchdog()
      resetExperiencePaint()
      section.classList.remove('is-locked', 'is-hot', 'is-held')
      lenisRef.current?.start()
    }

    function unlockSection(dir) {
      if (!locked) return
      forceUnlockCleanup()
      // Keep soft-snap from immediately re-capturing fruit top.
      suppressFruitSnap()

      if (dir > 0) {
        const next = section.nextElementSibling
        if (next) {
          scrollTo(next, { behavior: 'smooth' })
        } else {
          scrollTo(section.offsetTop + section.offsetHeight, { behavior: 'smooth' })
        }
      } else {
        // Land clearly above half-reveal / capture band (not offsetTop - 1).
        const escapeY = section.offsetTop - window.innerHeight * 0.55
        scrollTo(Math.max(0, escapeY), { behavior: 'smooth' })
      }
    }

    function onWheel(e) {
      if (!locked) return
      e.preventDefault()
      e.stopPropagation()

      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)

      if (absX > absY && absX > WHEEL_STEP_X) {
        step(e.deltaX > 0 ? 1 : -1)
        return
      }
      if (absY > WHEEL_UNLOCK_Y) {
        unlockSection(e.deltaY > 0 ? 1 : -1)
      }
    }

    function onTouchStart(e) {
      if (!locked || e.touches.length !== 1) return
      touchActive = true
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }

    function onTouchEnd(e) {
      if (!locked || !touchActive) return
      touchActive = false
      const touch = e.changedTouches[0]
      if (!touch) return
      const dx = touch.clientX - touchStartX
      const dy = touch.clientY - touchStartY
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      if (absX < 36 && absY < 36) return
      if (absX > absY) {
        step(dx < 0 ? 1 : -1)
      } else {
        unlockSection(dy > 0 ? 1 : -1)
      }
    }

    function onHoldStart(e) {
      if (!locked || reduced.matches) return
      // Mouse only — touch uses swipe for step/unlock; a tap must not pause the loop.
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      held = true
      section.classList.add('is-held')
      clearHold()
      if (tween) tween.pause()
    }

    function onHoldEnd() {
      if (!held) return
      held = false
      section.classList.remove('is-held')
      if (!locked || reduced.matches) return
      if (tween) {
        // Slowly resume in-flight transition, then hold rules apply via onComplete.
        tween.timeScale(0.55)
        tween.resume()
        return
      }
      // Was paused on settled hold — ease back into loop.
      scheduleHold(RESUME_HOLD_MS)
    }

    let pendingEnter = false

    function createPinWatcher() {
      if (pinTrigger) {
        pinTrigger.kill()
        pinTrigger = null
      }
      pinTrigger = ScrollTrigger.create({
        trigger: section,
        // Lock only once section is ~half revealed (both directions).
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => {
          if (reduced.matches) return
          if (performance.now() < snapSuppressUntil) return
          pendingEnterFromBelow = false
          if (!assetsReady) {
            pendingEnter = true
            return
          }
          lockSection({ fromBelow: false })
        },
        onEnterBack: () => {
          if (reduced.matches) return
          if (performance.now() < snapSuppressUntil) return
          pendingEnterFromBelow = true
          if (!assetsReady) {
            pendingEnter = true
            return
          }
          lockSection({ fromBelow: true })
        },
        onLeave: () => {
          pendingEnter = false
          pendingEnterFromBelow = false
          if (locked) forceUnlockCleanup()
          else resetExperiencePaint()
        },
        onLeaveBack: () => {
          pendingEnter = false
          pendingEnterFromBelow = false
          if (locked) forceUnlockCleanup()
          else resetExperiencePaint()
        },
      })
    }

    function tryLockIfInView() {
      if (reduced.matches || !assetsReady || locked) return
      if (performance.now() < snapSuppressUntil) return
      const rect = section.getBoundingClientRect()
      const inView = pendingEnter || pinTrigger?.isActive || isHalfRevealed()
      if (inView) {
        const fromBelow = pendingEnterFromBelow || rect.top < -ALIGN_TOLERANCE_PX
        pendingEnter = false
        pendingEnterFromBelow = false
        lockSection({ fromBelow })
      }
    }

    function applyReducedStatic() {
      section.classList.add('is-reduced')
      section.classList.remove('is-hot', 'is-locked', 'is-held')
      stopDriftGuard()
      stopLoopMotion()
      applyFlavour(0).then((ok) => {
        if (!ok || !alive) return
        paintFlavourFrame(0, SETTLED_T)
      })
    }

    function onReducedChange() {
      if (reduced.matches) {
        if (locked) {
          alignGeneration += 1
          stopAlignLoop()
          locked = false
          stopDriftGuard()
          stopLoopWatchdog()
          lenisRef.current?.start()
        }
        if (pinTrigger) {
          pinTrigger.kill()
          pinTrigger = null
        }
        applyReducedStatic()
      } else {
        section.classList.remove('is-reduced')
        paintSeed()
        createPinWatcher()
        ScrollTrigger.refresh()
        tryLockIfInView()
      }
    }

    const unregisterSectionTarget = registerSectionSnapTarget(
      'from-fruit',
      () => section.offsetTop,
    )

    const unregisterSnapPoints = registerSnapPoints('from-fruit', () => {
      if (reduced.matches) return []
      if (performance.now() < snapSuppressUntil) return []
      // Never magnetize the seed frame before we can lock + animate.
      if (!assetsReady) return []
      // No magnet through Ritual — only once FTS is half revealed (or already locked).
      if (!locked && !isHalfRevealed()) return []
      const y = section.offsetTop
      const band = window.innerHeight * HALF_REVEAL
      return [
        {
          y,
          activeMin: y - band,
          activeMax: y + band,
        },
      ]
    })

    const holdTarget = stageEl || bottleEl
    holdTarget?.addEventListener('pointerdown', onHoldStart)
    window.addEventListener('pointerup', onHoldEnd)
    window.addEventListener('pointercancel', onHoldEnd)
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    section.addEventListener('touchstart', onTouchStart, { passive: true })
    section.addEventListener('touchend', onTouchEnd, { passive: true })
    function onCompactChange() {
      if (activeIndex >= 0) paintFlavourFrame(activeIndex, currentT)
    }

    compactQuery.addEventListener('change', onCompactChange)
    reduced.addEventListener('change', onReducedChange)

    paintSeed()
    if (!reduced.matches) {
      createPinWatcher()
    } else {
      // Reduced path waits for assets then paints static.
    }

    // Unlock the experience as soon as the first flavour is ready; warm the rest in background.
    applyFlavour(0)
      .catch(() => false)
      .then((ok) => {
        if (!alive) return
        assetsReady = true
        section.setAttribute('data-assets-ready', '')
        if (reduced.matches) {
          if (ok) applyReducedStatic()
          else paintSeed()
        } else {
          tryLockIfInView()
        }
        preloadAllFruitFlavours(flavours).catch(() => {})
      })

    return () => {
      alive = false
      alignGeneration += 1
      stopAlignLoop()
      stopDriftGuard()
      stopLoopWatchdog()
      stopLoopMotion()
      if (locked) lenisRef.current?.start()
      if (pinTrigger) pinTrigger.kill()
      unregisterSectionTarget()
      unregisterSnapPoints()
      holdTarget?.removeEventListener('pointerdown', onHoldStart)
      window.removeEventListener('pointerup', onHoldEnd)
      window.removeEventListener('pointercancel', onHoldEnd)
      window.removeEventListener('wheel', onWheel, { capture: true })
      section.removeEventListener('touchstart', onTouchStart)
      section.removeEventListener('touchend', onTouchEnd)
      compactQuery.removeEventListener('change', onCompactChange)
      reduced.removeEventListener('change', onReducedChange)
      section.classList.remove('is-locked', 'is-hot', 'is-held', 'is-reduced')
      section.removeAttribute('data-assets-ready')
    }
  }, [
    sectionRef,
    lenisRef,
    scrollTo,
    registerSectionSnapTarget,
    registerSnapPoints,
    interruptSoftSnap,
  ])
}
