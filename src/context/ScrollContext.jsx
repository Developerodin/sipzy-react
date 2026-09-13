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

gsap.registerPlugin(ScrollTrigger)

const ScrollContext = createContext(null)

export function ScrollProvider({ children }) {
  const lenisRef = useRef(null)
  const scrollingDownRef = useRef(true)
  const pageScrollYRef = useRef(
    typeof window !== 'undefined' ? window.scrollY : 0,
  )
  const contactCoverRef = useRef(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis = null
    let ticker = null

    const trackScrollDirection = () => {
      const y = window.scrollY
      if (Math.abs(y - pageScrollYRef.current) >= 1) {
        scrollingDownRef.current = y > pageScrollYRef.current
        pageScrollYRef.current = y
      }
    }

    window.addEventListener('scroll', trackScrollDirection, { passive: true })

    if (!reduceMotion.matches) {
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
    } else {
      lenisRef.current = null
      ScrollTrigger.refresh()
    }

    const onChange = () => {
      if (reduceMotion.matches) {
        lenis?.stop()
      } else {
        lenis?.start()
      }
      ScrollTrigger.refresh()
    }
    reduceMotion.addEventListener('change', onChange)
    ScrollTrigger.refresh()

    return () => {
      reduceMotion.removeEventListener('change', onChange)
      window.removeEventListener('scroll', trackScrollDirection)
      if (ticker) gsap.ticker.remove(ticker)
      if (lenis) {
        lenis.destroy()
        lenisRef.current = null
      }
      ScrollTrigger.getAll().forEach((t) => t.kill())
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

    const el =
      typeof target === 'string' ? document.querySelector(target) : target
    if (!el) return

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

  const value = useMemo(
    () => ({
      lenisRef,
      scrollTo,
      scrollToContactCover,
      registerContactCover,
      isScrollingDown,
    }),
    [scrollTo, scrollToContactCover, registerContactCover, isScrollingDown],
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
