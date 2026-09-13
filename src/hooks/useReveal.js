import { useEffect } from 'react'

/**
 * Observes .reveal elements and adds .is-visible once (vanilla parity).
 * Call once at app root after sections mount.
 */
export function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef?.current ?? document
    const elements = [...root.querySelectorAll('.reveal')]
    if (!elements.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -5%' },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [rootRef])
}
