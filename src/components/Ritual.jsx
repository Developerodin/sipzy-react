import { useEffect, useRef } from 'react'
import { useScroll } from '../context/ScrollContext'
import { getPrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function Ritual() {
  const titleRef = useRef(null)
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
      <div className="ritual-grid">
        <article className="ritual-card reveal">
          <span>01</span>
          <div className="ritual-icon" aria-hidden="true">
            ❄
          </div>
          <h3>Chill it</h3>
          <p>Give the bottle a proper fridge moment. Colder is the mood.</p>
        </article>
        <article className="ritual-card reveal">
          <span>02</span>
          <div className="ritual-icon" aria-hidden="true">
            ✦
          </div>
          <h3>Pop it</h3>
          <p>
            Silver cap off. Playlist up. No measuring, mixing or waiting.
          </p>
        </article>
        <article className="ritual-card reveal">
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
    </section>
  )
}
