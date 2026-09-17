import { useEffect } from 'react'
import { findBottles as bottles } from '../data/findBottles'

/**
 * Port of vanilla Find your Sipzy flavour gravity field (app.js).
 * Operates on DOM inside sectionRef (must contain vanilla data-* hooks).
 */
export function useFindOrbit(sectionRef) {
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const field = section.querySelector('[data-find-field]')
    const orbitRoot = section.querySelector('[data-find-orbit]')
    const play = section.querySelector('[data-find-play]')
    const ripple = section.querySelector('[data-find-ripple]')
    const story = section.querySelector('[data-find-story]')
    const detail = section.querySelector('[data-find-detail]')
    const detailName = section.querySelector('[data-find-detail-name]')
    const detailAbv = section.querySelector('[data-find-detail-abv]')
    const detailSize = section.querySelector('[data-find-detail-size]')
    const stage = section.querySelector('[data-find-stage]')
    const nav = section.querySelector('[data-find-nav]')
    const prevBtn = section.querySelector('[data-find-prev]')
    const nextBtn = section.querySelector('[data-find-next]')
    const fallback = section.querySelector('[data-find-fallback]')
    if (
      !field ||
      !orbitRoot ||
      !play ||
      !ripple ||
      !story ||
      !detail ||
      !detailName ||
      !detailAbv ||
      !detailSize ||
      !stage ||
      !nav ||
      !prevBtn ||
      !nextBtn ||
      !fallback
    ) {
      return undefined
    }

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const narrowQuery = window.matchMedia('(max-width: 747px)')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    /** Slow clockwise drift: ~full revolution every ~55s */
    const ORBIT_SPEED = (Math.PI * 2) / 55

    let nodes = []
    let selectedId = null
    let openedAt = 0
    let inView = false
    let rafId = 0
    let transitioning = false
    let enterTimer = 0
    let collisionUntil = 0
    let pointer = { x: 0, y: 0, active: false }
    let center = { x: 0, y: 0 }
    let radius = 180
    let touchStartX = 0
    let selectedSpot = { x: 0, y: -8, scale: 1.95 }
    let alive = true

    const orbitHandlers = []
    const fallbackHandlers = []

    function isReduced() {
      return reduceMotion.matches
    }

    function isMobileLike() {
      return narrowQuery.matches || !finePointer.matches
    }

    function bottleById(id) {
      return bottles.find((item) => item.id === id)
    }

    function bottleIndex(id) {
      return bottles.findIndex((item) => item.id === id)
    }

    function measure() {
      const rect = field.getBoundingClientRect()
      center = { x: rect.width / 2, y: rect.height / 2 }
      const item = nodes[0]?.el
      const maxSide = Math.max(item?.offsetWidth || 96, item?.offsetHeight || 120)
      const visualHalf = maxSide * 0.22
      const inset = visualHalf + 20
      radius = Math.max(96, Math.min(rect.width, rect.height) / 2 - inset)
      field.style.setProperty('--orbit', `${radius * 2}px`)
      selectedSpot = isMobileLike()
        ? { x: 0, y: -20, scale: 1.72 }
        : { x: 0, y: -10, scale: 1.95 }
    }

    function buildOrbit() {
      nodes = bottles
        .map((bottle, index) => {
          const el = orbitRoot.querySelector(`[data-bottle="${bottle.id}"]`)
          return {
            bottle,
            el,
            homeAngle: (bottle.angle * Math.PI) / 180,
            phase: index * 0.87,
            floatAmp: 8 + (index % 3) * 3,
            rotAmp: 4 + (index % 4),
            scaleBase: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            blur: 0,
            opacity: 1,
            gx: 0,
            gy: 0,
          }
        })
        .filter((node) => node.el)
    }

    function showDetail(bottle) {
      detailName.textContent = bottle.name.toUpperCase()
      detailAbv.textContent = bottle.abv
      detailSize.textContent = bottle.size
      detail.classList.remove('is-visible')
      void detail.offsetWidth
      detail.classList.add('is-visible')
    }

    function hideDetail() {
      detail.classList.remove('is-visible')
    }

    function showStory(bottle) {
      story.textContent = bottle.line
      story.hidden = false
      story.setAttribute('aria-hidden', 'false')
    }

    function hideStory() {
      story.textContent = ''
      story.hidden = true
      story.setAttribute('aria-hidden', 'true')
    }

    function setControls() {
      const open = Boolean(selectedId)
      nav.hidden = !open
      play.classList.toggle('is-open', open)
    }

    function applyNodeTransform(node) {
      const { el, x, y, scale, rotate, blur, opacity } = node
      el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale}) rotate(${rotate}deg)`
      el.style.filter = blur > 0.05 ? `blur(${blur}px)` : 'none'
      el.style.opacity = String(opacity)
    }

    function homePosition(node, t) {
      const floatX = Math.sin(t * 0.55 + node.phase) * node.floatAmp
      const floatY = Math.cos(t * 0.42 + node.phase * 1.3) * (node.floatAmp * 0.85)
      const drift = isReduced() ? 0 : -t * ORBIT_SPEED
      const angle = node.homeAngle + drift + Math.sin(t * 0.18 + node.phase) * 0.08
      const r = radius * (0.98 + Math.sin(t * 0.25 + node.phase) * 0.025)
      return {
        x: Math.cos(angle) * r + floatX,
        y: Math.sin(angle) * r + floatY,
        rotate: Math.sin(t * 0.35 + node.phase) * node.rotAmp,
        scale: node.scaleBase,
      }
    }

    function updateIdlePhysics(now) {
      const t = now / 1000
      const px = pointer.x - center.x
      const py = pointer.y - center.y
      const useGravity = pointer.active && !isMobileLike() && !selectedId
      const damp = 0.14

      nodes.forEach((node) => {
        if (selectedId && node.bottle.id === selectedId) return

        const home = homePosition(node, t)
        let targetX = home.x
        let targetY = home.y
        let targetScale = home.scale
        let targetRotate = home.rotate
        let targetBlur = 0
        let targetOpacity = 1

        if (useGravity) {
          const dx = px - home.x
          const dy = py - home.y
          const dist = Math.hypot(dx, dy) || 1
          const influence = Math.max(0, 1 - dist / (radius * 1.85))
          const pull = influence * influence * 22
          const near = dist < 70 ? -0.28 : 1
          node.gx += (dx / dist) * pull * near * 0.07
          node.gy += (dy / dist) * pull * near * 0.07
          node.gx *= 0.88
          node.gy *= 0.88
          targetX += node.gx
          targetY += node.gy
          targetScale += influence * 0.05
        } else {
          node.gx *= 0.82
          node.gy *= 0.82
          targetX += node.gx
          targetY += node.gy
        }

        if (selectedId && node.bottle.id !== selectedId) {
          targetX *= 1.12
          targetY *= 1.12
          targetScale *= 0.62
          targetBlur = 3.5
          targetOpacity = 0.14
          node.el.classList.add('is-pushed')
        } else if (!selectedId) {
          node.el.classList.remove('is-pushed')
        }

        node.x += (targetX - node.x) * damp
        node.y += (targetY - node.y) * damp
        node.scale += (targetScale - node.scale) * damp
        node.rotate += (targetRotate - node.rotate) * damp
        node.blur += (targetBlur - node.blur) * damp
        node.opacity += (targetOpacity - node.opacity) * damp
        applyNodeTransform(node)
      })
    }

    function placeSelectedBottle(node, t, now) {
      if (now < collisionUntil) {
        const progress = Math.min(1, Math.max(0, 1 - (collisionUntil - now) / 520))
        const ease = 1 - Math.pow(1 - progress, 3)
        node.x += (0 - node.x) * (0.16 + ease * 0.2)
        node.y += (0 - node.y) * (0.16 + ease * 0.2)
        node.scale = selectedSpot.scale * 0.86 + Math.sin(ease * Math.PI) * 0.18
        node.rotate += (0 - node.rotate) * 0.15
        node.blur = 0
        node.opacity = 1
        applyNodeTransform(node)
        return
      }
      const targetX = selectedSpot.x + Math.sin(t * 0.5) * 3
      const targetY = selectedSpot.y + Math.cos(t * 0.4) * 4
      node.x += (targetX - node.x) * 0.12
      node.y += (targetY - node.y) * 0.12
      node.scale += (selectedSpot.scale - node.scale) * 0.12
      node.rotate = Math.sin(t * 0.3) * 3
      node.blur = 0
      node.opacity = 1
      applyNodeTransform(node)
    }

    function tick(now) {
      if (!alive || !inView || isReduced()) {
        rafId = 0
        return
      }
      updateIdlePhysics(now)
      if (selectedId) {
        const active = nodes.find((n) => n.bottle.id === selectedId)
        if (active) placeSelectedBottle(active, now / 1000, now)
      }
      rafId = requestAnimationFrame(tick)
    }

    function ensureLoop() {
      if (!rafId && inView && !isReduced() && alive) {
        rafId = requestAnimationFrame(tick)
      }
    }

    function stopLoop() {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }

    function snapStaticLayout() {
      nodes.forEach((node) => {
        const home = homePosition(node, 0)
        if (selectedId === node.bottle.id) {
          node.x = selectedSpot.x
          node.y = selectedSpot.y
          node.scale = selectedSpot.scale
          node.rotate = 0
          node.opacity = 1
          node.blur = 0
        } else if (selectedId) {
          node.x = home.x * 1.12
          node.y = home.y * 1.12
          node.scale = home.scale * 0.62
          node.opacity = 0.14
          node.blur = 3.5
        } else {
          node.x = home.x
          node.y = home.y
          node.scale = home.scale
          node.rotate = 0
          node.opacity = 1
          node.blur = 0
        }
        applyNodeTransform(node)
      })
    }

    function burstRipple(accent) {
      ripple.classList.remove('is-burst')
      ripple.style.borderColor = accent
      void ripple.offsetWidth
      ripple.classList.add('is-burst')
    }

    function selectBottle(id, { fromSwap = false } = {}) {
      if (!alive) return
      const bottle = bottleById(id)
      if (!bottle) return
      if (transitioning && !fromSwap) return
      if (selectedId === id && !fromSwap) return

      if (enterTimer) {
        window.clearTimeout(enterTimer)
        enterTimer = 0
      }

      transitioning = true
      field.classList.add('is-selected')
      requestAnimationFrame(() => {
        if (alive) measure()
      })

      const previousId = selectedId
      const activeNode = nodes.find((n) => n.bottle.id === id)

      nodes.forEach((node) => {
        node.el.classList.toggle('is-active', node.bottle.id === id)
        node.el.setAttribute(
          'aria-pressed',
          node.bottle.id === id ? 'true' : 'false',
        )
      })

      const runEnter = () => {
        if (!alive) return
        selectedId = id
        openedAt = performance.now()
        showDetail(bottle)
        showStory(bottle)
        setControls()
        burstRipple(bottle.accent)
        collisionUntil = performance.now() + 520

        if (activeNode && !isReduced()) {
          activeNode.scale = selectedSpot.scale * 0.82
          applyNodeTransform(activeNode)
        }

        requestAnimationFrame(() => {
          if (!alive) return
          if (isReduced()) snapStaticLayout()
          enterTimer = window.setTimeout(() => {
            transitioning = false
            enterTimer = 0
          }, fromSwap ? 420 : 700)
        })
      }

      if (previousId && previousId !== id && !isReduced()) {
        enterTimer = window.setTimeout(runEnter, 180)
      } else {
        runEnter()
      }

      ensureLoop()
    }

    function resetField() {
      if (enterTimer) {
        window.clearTimeout(enterTimer)
        enterTimer = 0
      }
      selectedId = null
      openedAt = 0
      transitioning = false
      field.classList.remove('is-selected')
      requestAnimationFrame(() => {
        if (alive) measure()
      })
      hideDetail()
      hideStory()
      setControls()
      nodes.forEach((node) => {
        node.el.classList.remove('is-active', 'is-pushed')
        node.el.setAttribute('aria-pressed', 'false')
      })
      if (isReduced()) snapStaticLayout()
      ensureLoop()
    }

    function stepBottle(delta) {
      if (!selectedId) return
      const index = bottleIndex(selectedId)
      const next = bottles[(index + delta + bottles.length) % bottles.length]
      selectBottle(next.id, { fromSwap: true })
    }

    function onPointerMove(event) {
      if (isMobileLike() || isReduced()) return
      const rect = field.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.active = true
    }

    function onFieldPointerLeave() {
      pointer.active = false
    }

    function bindOrbitEvents() {
      nodes.forEach((node) => {
        const onClick = (event) => {
          event.stopPropagation()
          if (selectedId === node.bottle.id) {
            if (performance.now() - openedAt < 400) return
            resetField()
            return
          }
          if (selectedId) return
          selectBottle(node.bottle.id)
        }
        node.el.addEventListener('click', onClick)
        orbitHandlers.push({ el: node.el, onClick })
      })
    }

    function setupFallback() {
      fallback.querySelectorAll('[data-fallback-bottle]').forEach((button) => {
        const onClick = () => {
          const bottle = bottleById(button.dataset.fallbackBottle)
          if (!bottle) return
          fallback.querySelectorAll('button').forEach((btn) => {
            btn.classList.toggle('is-active', btn === button)
          })
          let panel = section.querySelector('[data-find-reduced-panel]')
          if (!panel) {
            panel = document.createElement('div')
            panel.className = 'find-reduced-panel'
            panel.dataset.findReducedPanel = ''
            panel.innerHTML = `
            <img alt="">
            <div>
              <p data-reduced-name></p>
              <p data-reduced-meta></p>
              <p data-reduced-line></p>
            </div>
          `
            fallback.before(panel)
          }
          const img = panel.querySelector('img')
          img.src = bottle.src
          img.alt = `Sipzy ${bottle.name} ${bottle.abv} bottle`
          panel.querySelector('[data-reduced-name]').textContent =
            bottle.name.toUpperCase()
          panel.querySelector('[data-reduced-meta]').textContent =
            `${bottle.abv} · ${bottle.size}`
          panel.querySelector('[data-reduced-line]').textContent = bottle.line
        }
        button.addEventListener('click', onClick)
        fallbackHandlers.push({ el: button, onClick })
      })
    }

    function applyReducedMode() {
      if (!alive) return
      const reduced = isReduced()
      section.classList.toggle('is-reduced', reduced)
      fallback.hidden = !reduced
      fallback.setAttribute('aria-hidden', reduced ? 'false' : 'true')
      if (reduced) {
        stopLoop()
        resetField()
      } else {
        measure()
        snapStaticLayout()
        ensureLoop()
      }
      setControls()
    }

    function onTouchStart(event) {
      if (!selectedId || event.touches.length !== 1) return
      touchStartX = event.touches[0].clientX
    }

    function onTouchEnd(event) {
      if (!selectedId || !touchStartX) return
      const dx = event.changedTouches[0].clientX - touchStartX
      touchStartX = 0
      if (Math.abs(dx) < 48) return
      stepBottle(dx < 0 ? 1 : -1)
    }

    function onPrevClick(event) {
      event.stopPropagation()
      stepBottle(-1)
    }

    function onNextClick(event) {
      event.stopPropagation()
      stepBottle(1)
    }

    function onStageClick(event) {
      if (!selectedId) return
      if (
        event.target.closest(
          '.find-orbit-item, [data-find-prev], [data-find-next]',
        )
      ) {
        return
      }
      resetField()
    }

    function onKeyDown(event) {
      if (event.key !== 'Escape' || !selectedId) return
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable]')
      ) {
        return
      }
      resetField()
    }

    function onResize() {
      if (!alive) return
      measure()
      setControls()
      if (isReduced()) snapStaticLayout()
    }

    function onFinePointerChange() {
      if (!alive) return
      setControls()
    }

    function onNarrowChange() {
      if (!alive) return
      measure()
      setControls()
    }

    const viewObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!alive) return
          inView = entry.isIntersecting
          if (inView) {
            measure()
            ensureLoop()
          } else {
            stopLoop()
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    field.addEventListener('touchstart', onTouchStart, { passive: true })
    field.addEventListener('touchend', onTouchEnd, { passive: true })
    field.addEventListener('pointermove', onPointerMove)
    field.addEventListener('pointerleave', onFieldPointerLeave)
    prevBtn.addEventListener('click', onPrevClick)
    nextBtn.addEventListener('click', onNextClick)
    stage.addEventListener('click', onStageClick)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    reduceMotion.addEventListener('change', applyReducedMode)
    finePointer.addEventListener('change', onFinePointerChange)
    narrowQuery.addEventListener('change', onNarrowChange)

    buildOrbit()
    bindOrbitEvents()
    setupFallback()
    measure()
    snapStaticLayout()
    applyReducedMode()
    viewObserver.observe(section)
    setControls()
    requestAnimationFrame(() => {
      if (!alive) return
      const bounds = section.getBoundingClientRect()
      if (bounds.top < window.innerHeight * 0.9 && bounds.bottom > 80) {
        inView = true
        measure()
        ensureLoop()
      }
    })

    return () => {
      alive = false
      stopLoop()
      if (enterTimer) window.clearTimeout(enterTimer)
      viewObserver.disconnect()
      field.removeEventListener('touchstart', onTouchStart)
      field.removeEventListener('touchend', onTouchEnd)
      field.removeEventListener('pointermove', onPointerMove)
      field.removeEventListener('pointerleave', onFieldPointerLeave)
      prevBtn.removeEventListener('click', onPrevClick)
      nextBtn.removeEventListener('click', onNextClick)
      stage.removeEventListener('click', onStageClick)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      reduceMotion.removeEventListener('change', applyReducedMode)
      finePointer.removeEventListener('change', onFinePointerChange)
      narrowQuery.removeEventListener('change', onNarrowChange)
      orbitHandlers.forEach(({ el, onClick }) => {
        el.removeEventListener('click', onClick)
      })
      fallbackHandlers.forEach(({ el, onClick }) => {
        el.removeEventListener('click', onClick)
      })
    }
  }, [sectionRef])
}
