/**
 * Soft magnetic snap: when scroll coasts or stops between safe poses, continue
 * at the leftover pace into the next snap ahead — and recover broken mid-frames
 * only when already within a small epsilon of a snap.
 *
 * Coast handoff: take over while Lenis is still decelerating (no wait for idle).
 *
 * Point format (registry entries):
 *   number | { y, activeMin?, activeMax? }
 * Bare numbers are always active. Object points are ignored when scrollY is
 * outside [activeMin, activeMax].
 */

const COMMIT_VELOCITY = 2.8
const CANCEL_VELOCITY = 3.2
/** Fraction of neighbor gap used for capture (then capped by viewport). */
const CAPTURE_FRACTION = 0.65
/** Hard cap so section-sized gaps (e.g. Ritual) cannot magnetize mid-section. */
const CAPTURE_MAX_VH = 0.45
/** Idle nearest recovery only when already this close to a snap (broken frame). */
const BROKEN_FRAME_EPS_PX = 64
const MIN_DURATION = 0.35
const MAX_DURATION = 0.9
const MIN_PX_PER_SEC = 300
/** Idle safety net only — main path is decelerating coast handoff. */
const STOP_ARM_MS = 48
/** After wheel/touch input, briefly ignore coast settle so Lenis can start. */
const INPUT_COOLDOWN_MS = 80

/**
 * @typedef {{ y: number, activeMin?: number, activeMax?: number }} SnapPoint
 */

/**
 * @param {number | SnapPoint} entry
 * @returns {SnapPoint | null}
 */
function normalizeEntry(entry) {
  if (typeof entry === 'number') {
    if (!Number.isFinite(entry)) return null
    return { y: entry }
  }
  if (entry && typeof entry === 'object' && Number.isFinite(entry.y)) {
    return {
      y: entry.y,
      activeMin: Number.isFinite(entry.activeMin) ? entry.activeMin : undefined,
      activeMax: Number.isFinite(entry.activeMax) ? entry.activeMax : undefined,
    }
  }
  return null
}

/**
 * @param {SnapPoint} point
 * @param {number} scrollY
 */
function isPointActive(point, scrollY) {
  if (point.activeMin != null && scrollY < point.activeMin) return false
  if (point.activeMax != null && scrollY > point.activeMax) return false
  return true
}

/**
 * @param {object} options
 * @param {() => import('lenis').default | null} options.getLenis
 * @param {() => boolean} options.isReducedMotion
 * @param {Map<string, () => Array<number | SnapPoint>>} options.registry
 */
export function createSoftSnapController({
  getLenis,
  isReducedMotion,
  registry,
}) {
  let pointerDown = false
  let settling = false
  let settleTarget = null
  let settleId = 0
  let lastScrollY = 0
  let lastScrollAt = 0
  let lastAbsVelocity = 0
  let paceVelocity = 0
  let travelDir = 1
  let stopArm = 0
  let inputCoolUntil = 0
  let unsubScroll = null
  let unsubVirtual = null
  let destroyed = false

  /** @returns {SnapPoint[]} */
  function allPoints(scrollY) {
    const points = []
    for (const getPoints of registry.values()) {
      const list = getPoints()
      if (!Array.isArray(list)) continue
      for (const entry of list) {
        const point = normalizeEntry(entry)
        if (!point) continue
        if (!isPointActive(point, scrollY)) continue
        points.push(point)
      }
    }
    return points.sort((a, b) => a.y - b.y)
  }

  function captureRadius(i, points) {
    const p = points[i].y
    const prev = points[i - 1]?.y
    const next = points[i + 1]?.y
    const gapBefore = prev == null ? Infinity : p - prev
    const gapAfter = next == null ? Infinity : next - p
    const gap = Math.min(gapBefore, gapAfter)
    const maxPx = window.innerHeight * CAPTURE_MAX_VH
    if (gap === Infinity) return Math.min(window.innerHeight * 0.4, maxPx)
    return Math.min(gap * CAPTURE_FRACTION, maxPx)
  }

  /**
   * Nearest snap only when already within broken-frame epsilon
   * (or within capture radius if forceFullCapture — unused by directional path).
   */
  function nearestBrokenFrame(y, points) {
    if (!points.length) return null
    let best = null
    let bestDist = Infinity
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i].y
      const dist = Math.abs(p - y)
      if (dist > BROKEN_FRAME_EPS_PX || dist >= bestDist) continue
      best = p
      bestDist = dist
    }
    return best
  }

  /**
   * Prefer snap ahead while moving. Do not reverse to nearest across a section.
   * Idle/fromStop with no ahead: only recover if already within broken-frame eps.
   */
  function pickTarget(y, points, dir, preferDirection) {
    if (!points.length) return null

    if (preferDirection && dir !== 0) {
      let bestAhead = null
      let bestAheadDist = Infinity
      for (let i = 0; i < points.length; i += 1) {
        const p = points[i].y
        const delta = p - y
        if (delta * dir < -1) continue
        const dist = Math.abs(delta)
        if (dist > captureRadius(i, points) || dist >= bestAheadDist) continue
        bestAhead = p
        bestAheadDist = dist
      }
      if (bestAhead != null) return bestAhead
      // No reverse fallback while traveling — leave free-scroll zones alone.
      return nearestBrokenFrame(y, points)
    }

    return nearestBrokenFrame(y, points)
  }

  function durationForPace(dist, absFrameVelocity) {
    const pxPerSec = Math.max(absFrameVelocity * 60, MIN_PX_PER_SEC)
    let duration = (dist / pxPerSec) * 1.15
    if (dist < 120) duration = Math.min(duration, 0.35)
    const minDur = Math.min(MIN_DURATION, 0.18 + dist / 2000)
    return Math.min(MAX_DURATION, Math.max(minDur, duration))
  }

  function easeOutSine(t) {
    return 1 - Math.cos((t * Math.PI) / 2)
  }

  function isOurSettle(lenis) {
    return Boolean(settling && lenis?.userData?.softSnap)
  }

  function clearSettling() {
    settling = false
    settleTarget = null
    settleId += 1
  }

  /** Invalidate settle flags and freeze Lenis if we still own the smooth scroll. */
  function interruptSettle() {
    const lenis = getLenis()
    const owned = isOurSettle(lenis)
    clearSettling()
    if (owned && lenis) {
      lenis.scrollTo(lenis.scroll, { immediate: true })
    }
  }

  /**
   * @param {{ force?: boolean, fromStop?: boolean }} [opts]
   * force/fromStop: ignore velocity gate; prefer ahead then broken-frame eps only.
   */
  function trySettle({ force = false, fromStop = false } = {}) {
    if (destroyed || pointerDown) return
    if (isReducedMotion()) return
    const lenis = getLenis()
    if (!lenis) return

    // Coast settle must wait out post-input cooldown; idle force may proceed.
    if (!force && !fromStop && performance.now() < inputCoolUntil) return

    const frameVelocity = lenis.velocity ?? 0
    const absV = Math.abs(frameVelocity)

    // Allow take-over of Lenis coast; only skip if still too fast and not forced.
    if (!force && !fromStop && absV > COMMIT_VELOCITY && absV >= paceVelocity * 0.95) {
      return
    }

    const y = lenis.scroll ?? window.scrollY
    const points = allPoints(y)
    if (!points.length) return

    const dir = Math.sign(frameVelocity) || travelDir
    const target = pickTarget(y, points, dir, fromStop || absV > 0.25)
    if (target == null || Math.abs(target - y) < 0.75) return

    if (settling && settleTarget != null && Math.abs(settleTarget - target) < 1) {
      return
    }

    const dist = Math.abs(target - y)
    const pace = Math.max(absV, paceVelocity, 0.4)
    const duration = durationForPace(dist, pace)
    const id = ++settleId

    settling = true
    settleTarget = target

    // Replaces any in-flight Lenis smooth scroll (coast handoff).
    lenis.scrollTo(target, {
      duration,
      easing: easeOutSine,
      userData: { softSnap: true },
      onComplete: () => {
        if (id !== settleId) return
        settling = false
        settleTarget = null
        paceVelocity = 0
      },
    })
  }

  function armStopSettle() {
    if (stopArm) window.clearTimeout(stopArm)
    stopArm = window.setTimeout(() => {
      stopArm = 0
      if (destroyed || pointerDown) return
      if (performance.now() < inputCoolUntil) {
        armStopSettle()
        return
      }
      // Safety net: settle even if Lenis is still marked smooth (take over).
      trySettle({ force: true, fromStop: true })
    }, STOP_ARM_MS)
  }

  function clearStopArm() {
    if (stopArm) {
      window.clearTimeout(stopArm)
      stopArm = 0
    }
  }

  function onPointerDown() {
    pointerDown = true
    clearStopArm()
    interruptSettle()
  }

  function onPointerUp() {
    pointerDown = false
    trySettle({ force: true, fromStop: true })
  }

  function bindLenis(lenis) {
    if (unsubScroll) {
      unsubScroll()
      unsubScroll = null
    }
    if (unsubVirtual) {
      unsubVirtual()
      unsubVirtual = null
    }
    if (!lenis) return

    const onVirtualScroll = () => {
      inputCoolUntil = performance.now() + INPUT_COOLDOWN_MS
      clearStopArm()
      // New user input interrupts an in-flight settle; Lenis replaces the animation.
      if (settling) clearSettling()
    }

    const onScroll = (lenisInstance) => {
      if (destroyed) return
      const scroll = lenisInstance.scroll
      const velocity = lenisInstance.velocity ?? 0
      const absV = Math.abs(velocity)
      lastScrollY = scroll
      lastScrollAt = performance.now()

      if (absV > 0.15) {
        travelDir = Math.sign(velocity)
        paceVelocity = Math.max(absV, paceVelocity * 0.92)
        if (absV > paceVelocity) paceVelocity = absV
      } else {
        paceVelocity *= 0.98
      }

      if (pointerDown) {
        lastAbsVelocity = absV
        return
      }

      // Interrupted settle (user scrolled again).
      if (settling && absV > CANCEL_VELOCITY && absV > lastAbsVelocity + 0.05) {
        clearSettling()
      }

      // Primary path: take over while decelerating — including during Lenis coast.
      if (!settling && performance.now() >= inputCoolUntil) {
        const decelerating = absV < lastAbsVelocity - 0.015
        if (decelerating && absV <= COMMIT_VELOCITY && paceVelocity > 0.15) {
          trySettle()
        }
      }

      lastAbsVelocity = absV

      // Idle safety net (also runs during foreign smooth so we never wait it out).
      if (!settling) {
        armStopSettle()
      } else {
        clearStopArm()
      }
    }

    lenis.on('virtual-scroll', onVirtualScroll)
    lenis.on('scroll', onScroll)
    unsubVirtual = () => lenis.off('virtual-scroll', onVirtualScroll)
    unsubScroll = () => lenis.off('scroll', onScroll)
  }

  function attach() {
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
    window.addEventListener('touchend', onPointerUp, { passive: true })
    bindLenis(getLenis())
  }

  function detach() {
    destroyed = true
    clearStopArm()
    if (unsubScroll) unsubScroll()
    if (unsubVirtual) unsubVirtual()
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    window.removeEventListener('touchend', onPointerUp)
  }

  return {
    attach,
    detach,
    bindLenis,
    interruptSettle,
    refresh: () => trySettle({ force: true, fromStop: true }),
    get lastScrollY() {
      return lastScrollY
    },
    get lastScrollAt() {
      return lastScrollAt
    },
  }
}
