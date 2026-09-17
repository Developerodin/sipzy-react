import { useEffect, useRef } from 'react'
import { useScroll } from '../context/ScrollContext'
import { getPrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const CAP_SRC = '/assets/products-webp/16/steel%20cap.png'
const CAP_DURATION_MS = 2500
const DESKTOP_QUERY = '(min-width: 901px)'

export default function Ritual() {
  const titleRef = useRef(null)
  const gridWrapRef = useRef(null)
  const gridRef = useRef(null)
  const capRef = useRef(null)
  const { isScrollingDown } = useScroll()

  useEffect(() => {
    const title = titleRef.current
    if (!title) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function armDrop() {
      title.classList.toggle('is-droppable', !reduceMotion.matches)
    }

    function playFall() {
      const fromY = -Math.max(0, Math.round(title.getBoundingClientRect().top))
      title.style.setProperty('--ritual-fall', `${fromY}px`)
      title.classList.remove('is-falling', 'is-settled')
      void title.offsetWidth
      title.classList.add('is-falling')
    }

    const onAnimEnd = (event) => {
      if (event.animationName !== 'ritual-title-fall') return
      title.classList.add('is-settled')
      title.classList.remove('is-falling')
    }
    title.addEventListener('animationend', onAnimEnd)

    const titleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            title.classList.remove('is-falling', 'is-settled')
            return
          }
          if (getPrefersReducedMotion()) {
            title.classList.remove('is-falling', 'is-droppable')
            title.classList.add('is-settled')
            return
          }
          const enteringFromBelow =
            entry.boundingClientRect.top > window.innerHeight * 0.12
          if (isScrollingDown() && enteringFromBelow) playFall()
          else title.classList.add('is-settled')
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -8%' },
    )

    armDrop()
    reduceMotion.addEventListener('change', armDrop)
    titleObserver.observe(title)

    return () => {
      title.removeEventListener('animationend', onAnimEnd)
      reduceMotion.removeEventListener('change', armDrop)
      titleObserver.disconnect()
    }
  }, [isScrollingDown])

  useEffect(() => {
    const wrap = gridWrapRef.current
    const grid = gridRef.current
    const cap = capRef.current
    if (!wrap || !grid || !cap) return undefined

    const desktopQuery = window.matchMedia(DESKTOP_QUERY)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cards = [...grid.querySelectorAll('.ritual-card')]

    let anim = null
    let rafId = 0
    let playing = false

    function revealAllCards() {
      cards.forEach((card) => card.classList.add('is-cap-revealed'))
    }

    function hideAllCards() {
      cards.forEach((card) => card.classList.remove('is-cap-revealed'))
    }

    function stopCap() {
      playing = false
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      if (anim) {
        anim.cancel()
        anim = null
      }
      cap.classList.remove('is-rolling')
      cap.style.transform = ''
    }

    function syncMode() {
      stopCap()
      if (!desktopQuery.matches || reduceMotion.matches) {
        revealAllCards()
        return
      }
      hideAllCards()
    }

    function syncCapVertical() {
      const wrapRect = wrap.getBoundingClientRect()
      const gridRect = grid.getBoundingClientRect()
      const midY = gridRect.top + gridRect.height / 2 - wrapRect.top
      cap.style.top = `${midY}px`
    }

    function unlockPassedCards() {
      const capRect = cap.getBoundingClientRect()
      cards.forEach((card) => {
        if (card.classList.contains('is-cap-revealed')) return
        const cardRect = card.getBoundingClientRect()
        if (capRect.left > cardRect.right) {
          card.classList.add('is-cap-revealed')
        }
      })
    }

    function tick() {
      if (!playing) return
      unlockPassedCards()
      rafId = requestAnimationFrame(tick)
    }

    function playCapRoll() {
      if (!desktopQuery.matches || reduceMotion.matches || playing) return

      stopCap()
      hideAllCards()
      syncCapVertical()

      const capWidth = cap.offsetWidth || 208
      const wrapLeft = wrap.getBoundingClientRect().left
      const startX = -wrapLeft - capWidth
      const endX = window.innerWidth - wrapLeft
      const travel = endX - startX
      const degrees = (travel / (Math.PI * capWidth)) * 360

      playing = true
      cap.classList.add('is-rolling')
      cap.style.transform = `translate3d(${startX}px, -50%, 0) rotate(0deg)`

      anim = cap.animate(
        [
          {
            transform: `translate3d(${startX}px, -50%, 0) rotate(0deg)`,
          },
          {
            transform: `translate3d(${endX}px, -50%, 0) rotate(${degrees}deg)`,
          },
        ],
        {
          duration: CAP_DURATION_MS,
          easing: 'linear',
          fill: 'forwards',
        },
      )

      rafId = requestAnimationFrame(tick)

      anim.onfinish = () => {
        playing = false
        if (rafId) {
          cancelAnimationFrame(rafId)
          rafId = 0
        }
        revealAllCards()
        cap.classList.remove('is-rolling')
        cap.style.transform = ''
        anim = null
      }
    }

    const gridObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            stopCap()
            if (desktopQuery.matches && !reduceMotion.matches) hideAllCards()
            return
          }
          if (!desktopQuery.matches || reduceMotion.matches) {
            revealAllCards()
            return
          }
          playCapRoll()
        })
      },
      { threshold: 0.28, rootMargin: '0px 0px -6%' },
    )

    syncMode()
    gridObserver.observe(grid)
    desktopQuery.addEventListener('change', syncMode)
    reduceMotion.addEventListener('change', syncMode)

    const onResize = () => {
      if (playing) syncCapVertical()
    }
    window.addEventListener('resize', onResize)

    return () => {
      stopCap()
      gridObserver.disconnect()
      desktopQuery.removeEventListener('change', syncMode)
      reduceMotion.removeEventListener('change', syncMode)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section className="ritual section-pad" id="ritual">
      <header className="ritual-head">
        <p className="kicker reveal">The complicated recipe</p>
        <h2 className="ritual-title" ref={titleRef}>
          Three steps.
          <br />
          That’s the whole thing.
        </h2>
      </header>
      <div className="ritual-grid-wrap" ref={gridWrapRef}>
        <img
          ref={capRef}
          className="ritual-cap"
          src={CAP_SRC}
          alt=""
          aria-hidden="true"
          decoding="async"
        />
        <div className="ritual-grid" ref={gridRef}>
          <article className="ritual-card">
            <span>01</span>
            <div className="ritual-icon" aria-hidden="true">
              ❄
            </div>
            <h3>Chill it</h3>
            <p>Give the bottle a proper fridge moment. Colder is the mood.</p>
          </article>
          <article className="ritual-card">
            <span>02</span>
            <div className="ritual-icon" aria-hidden="true">
              ✦
            </div>
            <h3>Pop it</h3>
            <p>
              Silver cap off. Playlist up. No measuring, mixing or waiting.
            </p>
          </article>
          <article className="ritual-card">
            <span>03</span>
            <div className="ritual-icon" aria-hidden="true">
              ◡
            </div>
            <h3>Sipzy it</h3>
            <p>
              Pour over ice or drink chilled. Then let the night find its pace.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
