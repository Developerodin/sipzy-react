import { useEffect } from 'react'
import { useScroll } from '../context/ScrollContext'
import { getPrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * Intercepts in-page hash links. #contact uses the manifesto cover scroll.
 */
export function useAnchorScroll() {
  const { scrollTo, scrollToContactCover } = useScroll()

  useEffect(() => {
    const onClick = (event) => {
      const link = event.target.closest('a[href^="#"]')
      if (!link) return
      const href = link.getAttribute('href')
      if (!href || href === '#') return

      const target = document.querySelector(href)
      if (!target) return

      event.preventDefault()

      const behavior = getPrefersReducedMotion() ? 'auto' : 'smooth'
      if (href === '#contact' && scrollToContactCover(behavior)) {
        return
      }
      scrollTo(target, { behavior })
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [scrollTo, scrollToContactCover])
}
