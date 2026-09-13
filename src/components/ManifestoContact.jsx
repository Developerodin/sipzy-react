import { useEffect, useRef } from 'react'
import { useScroll } from '../context/ScrollContext'
import { getPrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function ManifestoContact() {
  const sectionRef = useRef(null)
  const { registerContactCover, isScrollingDown, scrollTo } = useScroll()

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const sticky = section.querySelector('.mc-sticky')
    const spacer = section.querySelector('[data-mc-spacer]')
    const from = section.querySelector('[data-mc-from]')
    const to = section.querySelector('[data-mc-to]')
    const pourFill = to?.querySelector('.pour-fill')
    if (!sticky || !spacer || !from || !to) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let ticking = false
    let inView = false
    let alive = true

    function clamp01(value) {
      return Math.min(1, Math.max(0, value))
    }

    function scrubDistance() {
      return Math.max(
        1,
        sticky.offsetHeight + spacer.offsetHeight - window.innerHeight,
      )
    }

    function progress() {
      return clamp01(-section.getBoundingClientRect().top / scrubDistance())
    }

    function contactScrollY() {
      return section.offsetTop + scrubDistance()
    }

    function syncPourFill(p) {
      if (!pourFill) return
      if (reduceMotion.matches) {
        pourFill.classList.add('is-filled')
        return
      }
      if (p >= 0.86 && isScrollingDown()) {
        if (!pourFill.classList.contains('is-filled')) {
          pourFill.classList.add('is-filled')
        }
        return
      }
      if (p < 0.2) {
        pourFill.classList.remove('is-filled')
      }
    }

    function paint() {
      if (!alive) return
      ticking = false
      if (reduceMotion.matches) {
        from.style.transform = ''
        to.style.transform = ''
        syncPourFill(1)
        return
      }
      const p = progress()
      from.style.transform = `translate3d(${p * 100}%, 0, 0)`
      to.style.transform = `translate3d(${(p - 1) * 100}%, 0, 0)`
      syncPourFill(p)
    }

    function requestPaint() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(paint)
    }

    const scrollToContactCover = (behavior = 'smooth') => {
      if (reduceMotion.matches || getPrefersReducedMotion()) {
        scrollTo(to, { behavior })
        return true
      }
      scrollTo(contactScrollY(), { behavior })
      requestPaint()
      return true
    }

    const unregister = registerContactCover(scrollToContactCover)

    function settleContactHash() {
      if (location.hash !== '#contact') return
      scrollToContactCover('auto')
    }

    const viewObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          inView = entry.isIntersecting
          if (inView) requestPaint()
        })
      },
      { rootMargin: '20% 0px' },
    )

    const onScroll = () => {
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
    reduceMotion.addEventListener('change', requestPaint)
    window.addEventListener('hashchange', settleContactHash)
    window.addEventListener('load', settleContactHash)

    requestPaint()
    settleContactHash()

    return () => {
      alive = false
      unregister()
      viewObserver.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', requestPaint)
      reduceMotion.removeEventListener('change', requestPaint)
      window.removeEventListener('hashchange', settleContactHash)
      window.removeEventListener('load', settleContactHash)
    }
  }, [registerContactCover, isScrollingDown, scrollTo])

  return (
    <section
      className="mc-push"
      data-mc-push
      ref={sectionRef}
      aria-label="Manifesto to contact"
    >
      <div className="mc-sticky">
        <div className="mc-stage">
          <section className="manifesto mc-panel" data-mc-from>
            <div className="manifesto-shape" aria-hidden="true" />
            <div className="manifesto-inner section-pad reveal">
              <p className="kicker">Our kind of night</p>
              <h2>
                Less planning.
                <br />
                More <em>plot twists.</em>
              </h2>
              <p>
                Sipzy is made for people who bring the playlist, save the group
                chat and know the best stories rarely start with “we stayed
                in.”
              </p>
            </div>
          </section>
          <section
            className="contact section-pad mc-panel"
            id="contact"
            data-mc-to
          >
            <p className="kicker reveal">Stockists · Events · Collaborations</p>
            <h2 className="reveal">
              Let’s make the
              <br />
              <em className="pour-fill">next pour pop.</em>
            </h2>
            <a className="contact-pill reveal" href="mailto:hello@sipzy.in">
              hello@sipzy.in <span aria-hidden="true">↗</span>
            </a>
          </section>
        </div>
      </div>
      <div className="mc-spacer" aria-hidden="true" data-mc-spacer />
    </section>
  )
}
