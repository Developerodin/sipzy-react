import { useEffect } from 'react'
import { useScroll } from '../context/ScrollContext'
import { getPrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * Intercepts in-page hash links. #contact uses the manifesto cover scroll.
 * #from-fruit lands on the section top via ScrollContext.
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

    const hash = window.location.hash
    if (hash === '#from-fruit' || hash === '#contact') {
      const jump = () => {
        if (hash === '#contact') {
          scrollToContactCover('auto')
        } else {
          const target = document.querySelector(hash)
          if (target) scrollTo(target, { behavior: 'auto' })
        }
      }
      // Child section hooks register snap targets in the same commit; retry after layout.
      requestAnimationFrame(() => {
        jump()
        window.setTimeout(jump, 320)
      })
    }

    return () => document.removeEventListener('click', onClick)
  }, [scrollTo, scrollToContactCover])
}
