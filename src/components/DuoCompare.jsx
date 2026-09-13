import { useEffect, useRef } from 'react'

export default function DuoCompare() {
  const duoRef = useRef(null)

  useEffect(() => {
    const duo = duoRef.current
    if (!duo) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting)
        })
      },
      { threshold: 0.18 },
    )
    observer.observe(duo)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      className="duo"
      data-duo
      ref={duoRef}
      aria-label="Compare Sipzy strengths"
    >
      <article className="duo-panel duo-panel--easy">
        <div className="duo-copy">
          <p className="kicker">The easy pour</p>
          <strong>
            8<span>%</span>
          </strong>
          <h3>
            Light on its feet.
            <br />
            Big on flavour.
          </h3>
          <p>275 ml · 7 fruit-led moods</p>
        </div>
        <img
          src="/assets/bottles/07-watermelon-wave-8pct-275ml.png"
          alt="Sipzy Watermelon Wave 8% bottle"
          loading="lazy"
        />
      </article>
      <article className="duo-panel duo-panel--bold">
        <div className="duo-copy">
          <p className="kicker">The stronger statement</p>
          <strong>
            16<span>%</span>
          </strong>
          <h3>
            Deeper character.
            <br />
            After-dark energy.
          </h3>
          <p>330 ml · 5 vintage-inspired moods</p>
        </div>
        <img
          src="/assets/bottles/11-jamun-cask-16pct-330ml.png"
          alt="Sipzy Jamun Cask 16% bottle"
          loading="lazy"
        />
      </article>
    </section>
  )
}
