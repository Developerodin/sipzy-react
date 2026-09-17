import { useRef } from 'react'
import { findBottles } from '../data/findBottles'
import { useFindOrbit } from '../hooks/useFindOrbit'

export default function FindYourSipzy() {
  const sectionRef = useRef(null)
  useFindOrbit(sectionRef)

  return (
    <section
      ref={sectionRef}
      className="find-sipzy"
      id="find"
      data-find-sipzy
      aria-labelledby="find-heading"
    >
      <div className="find-bg" aria-hidden="true" />
      <div className="find-glass" aria-hidden="true" />
      <div className="find-sipzy-inner section-pad">
        <header className="find-head reveal">
          <p className="kicker">Flavour gravity</p>
          <p className="find-sub">Five moods. One question.</p>
          <h2 id="find-heading">Find your Sipzy</h2>
        </header>

        <div className="find-stage" data-find-stage>
          <div className="find-play" data-find-play>
            <div
              className="find-field"
              data-find-field
              aria-label="Interactive Sipzy 16% bottle field"
            >
              <div className="find-orbit-guide" aria-hidden="true" />
              <div className="find-ripple" data-find-ripple aria-hidden="true" />

              <div className="find-orbit" data-find-orbit>
                {findBottles.map((bottle) => (
                  <button
                    key={bottle.id}
                    className="find-orbit-item"
                    type="button"
                    data-bottle={bottle.id}
                    aria-label={`${bottle.name}, ${bottle.abv} · ${bottle.size}`}
                    aria-pressed="false"
                  >
                    <img
                      src={bottle.src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable="false"
                    />
                    <span className="find-orbit-label">
                      {bottle.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="find-detail" data-find-detail aria-live="polite">
                <p className="find-detail-name" data-find-detail-name />
                <p className="find-detail-abv" data-find-detail-abv />
                <p className="find-detail-size" data-find-detail-size />
              </div>
            </div>

            <p className="find-story" data-find-story hidden />

            <div className="find-controls">
              <div className="find-nav" data-find-nav hidden>
                <button type="button" data-find-prev aria-label="Previous bottle">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M14.5 5.5 8 12l6.5 6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button type="button" data-find-next aria-label="Next bottle">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M9.5 5.5 16 12l-6.5 6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <ul className="find-fallback" data-find-fallback hidden aria-hidden="true">
          {findBottles.map((bottle) => (
            <li key={bottle.id}>
              <button type="button" data-fallback-bottle={bottle.id}>
                <strong>{bottle.name}</strong>
                <span>
                  {bottle.abv} · {bottle.size.toLowerCase()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
