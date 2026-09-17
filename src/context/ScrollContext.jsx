import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getPrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { createSoftSnapController } from '../lib/scroll/softSnap'

gsap.registerPlugin(ScrollTrigger)

const ScrollContext = createContext(null)

export function ScrollProvider({ children }) {
  const lenisRef = useRef(null)
  const scrollingDownRef = useRef(true)
  const pageScrollYRef = useRef(
    typeof window !== 'undefined' ? window.scrollY : 0,
  )
  const contactCoverRef = useRef(null)
  const snapRegistryRef = useRef(new Map())
  const softSnapRef = useRef(null)
  const sectionSnapTargetsRef = useRef(new Map())

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis = null
    let ticker = null
    let softSnap = null
    let proxyWired = false

    const trackScrollDirection = () => {
      const y = window.scrollY
      if (Math.abs(y - pageScrollYRef.current) >= 1) {
        scrollingDownRef.current = y > pageScrollYRef.current
        pageScrollYRef.current = y
      }
    }

    window.addEventListener('scroll', trackScrollDirection, { passive: true })

    softSnap = createSoftSnapController({
      getLenis: () => lenisRef.current,
      isReducedMotion: () => reduceMotion.matches,
      registry: snapRegistryRef.current,
    })
    softSnapRef.current = softSnap

    function wireScrollerProxy() {
      if (proxyWired) return
      proxyWired = true
      ScrollTrigger.scrollerProxy(document.body, {
        scrollTop(value) {
          const instance = lenisRef.current
          if (arguments.length) {
            if (instance) {
              instance.scrollTo(value, { immediate: true })
            } else {
              window.scrollTo(0, value)
            }
          }
          return instance ? instance.scroll : window.scrollY
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          }
        },
      })
      ScrollTrigger.defaults({ scroller: document.body })
    }

    function destroyLenis() {
      if (ticker) {
        gsap.ticker.remove(ticker)
        ticker = null
      }
      if (lenis) {
        lenis.destroy()
        lenis = null
        lenisRef.current = null
      }
      softSnap?.bindLenis(null)
    }

    function createLenis() {
      destroyLenis()
      if (reduceMotion.matches) {
        lenisRef.current = null
        ScrollTrigger.refresh()
        return
      }

      wireScrollerProxy()

      lenis = new Lenis({
        autoRaf: false,
        smoothWheel: true,
      })
      lenisRef.current = lenis
      lenis.on('scroll', ScrollTrigger.update)

      ticker = (time) => {
        lenis.raf(time * 1000)
      }
      gsap.ticker.add(ticker)
      gsap.ticker.lagSmoothing(0)

      softSnap.bindLenis(lenis)
      ScrollTrigger.refresh()
    }

    createLenis()
    softSnap.attach()

    const onChange = () => {
      if (reduceMotion.matches) {
        destroyLenis()
        ScrollTrigger.refresh()
      } else if (!lenisRef.current) {
        createLenis()
      } else {
        lenisRef.current.start()
        ScrollTrigger.refresh()
      }
    }
    reduceMotion.addEventListener('change', onChange)
    ScrollTrigger.refresh()

    return () => {
      reduceMotion.removeEventListener('change', onChange)
      window.removeEventListener('scroll', trackScrollDirection)
      softSnap.detach()
      softSnapRef.current = null
      destroyLenis()
      if (proxyWired) {
        ScrollTrigger.scrollerProxy(document.body, {})
        ScrollTrigger.defaults({ scroller: window })
        proxyWired = false
      }
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  const registerSnapPoints = useCallback((id, getPoints) => {
    // Points are read lazily on settle — do not force-snap on mount/register.
    snapRegistryRef.current.set(id, getPoints)
    return () => {
      snapRegistryRef.current.delete(id)
    }
  }, [])

  /** Named scroll targets for deep links (e.g. from-fruit → section top). */
  const registerSectionSnapTarget = useCallback((id, getY) => {
    sectionSnapTargetsRef.current.set(id, getY)
    return () => {
      sectionSnapTargetsRef.current.delete(id)
    }
  }, [])

  const scrollTo = useCallback((target, options = {}) => {
    const { behavior = 'smooth', offset = 0 } = options
    const reduced = getPrefersReducedMotion()
    const lenis = lenisRef.current

    if (typeof target === 'number') {
      if (lenis && !reduced && behavior !== 'auto') {
        lenis.scrollTo(target + offset, { immediate: behavior === 'auto' })
      } else {
        window.scrollTo({
          top: target + offset,
          behavior: behavior === 'auto' || reduced ? 'auto' : 'smooth',
        })
      }
      return
    }

    if (typeof target === 'string') {
      const snapGetY = sectionSnapTargetsRef.current.get(
        target.startsWith('#') ? target.slice(1) : target,
      )
      if (snapGetY) {
        const y = snapGetY()
        if (Number.isFinite(y)) {
          if (lenis && !reduced && behavior !== 'auto') {
            lenis.scrollTo(y + offset, { immediate: false })
          } else {
            window.scrollTo({
              top: y + offset,
              behavior: behavior === 'auto' || reduced ? 'auto' : 'smooth',
            })
          }
          return
        }
      }
    }

    const el =
      typeof target === 'string' ? document.querySelector(target) : target
    if (!el) return

    const elId = el.id
    if (elId) {
      const snapGetY = sectionSnapTargetsRef.current.get(elId)
      if (snapGetY) {
        const y = snapGetY()
        if (Number.isFinite(y)) {
          if (lenis && !reduced && behavior !== 'auto') {
            lenis.scrollTo(y + offset, { immediate: false })
          } else {
            window.scrollTo({
              top: y + offset,
              behavior: behavior === 'auto' || reduced ? 'auto' : 'smooth',
            })
          }
          return
        }
      }
    }

    if (lenis && !reduced && behavior !== 'auto') {
      lenis.scrollTo(el, { offset, immediate: false })
    } else {
      el.scrollIntoView({
        behavior: behavior === 'auto' || reduced ? 'auto' : 'smooth',
      })
    }
  }, [])

  const scrollToContactCover = useCallback(
    (behavior = 'smooth') => {
      if (contactCoverRef.current) {
        return contactCoverRef.current(behavior)
      }
      const contact = document.querySelector('#contact')
      if (!contact) return false
      scrollTo(contact, { behavior })
      return true
    },
    [scrollTo],
  )

  const registerContactCover = useCallback((fn) => {
    contactCoverRef.current = fn
    return () => {
      if (contactCoverRef.current === fn) contactCoverRef.current = null
    }
  }, [])

  const isScrollingDown = useCallback(() => scrollingDownRef.current, [])

  const interruptSoftSnap = useCallback(() => {
    softSnapRef.current?.interruptSettle?.()
  }, [])

  const value = useMemo(
    () => ({
      lenisRef,
      scrollTo,
      scrollToContactCover,
      registerContactCover,
      registerSnapPoints,
      registerSectionSnapTarget,
      interruptSoftSnap,
      isScrollingDown,
    }),
    [
      scrollTo,
      scrollToContactCover,
      registerContactCover,
      registerSnapPoints,
      registerSectionSnapTarget,
      interruptSoftSnap,
      isScrollingDown,
    ],
  )

  return (
    <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>
  )
}

export function useScroll() {
  const ctx = useContext(ScrollContext)
  if (!ctx) {
    throw new Error('useScroll must be used within ScrollProvider')
  }
  return ctx
}
