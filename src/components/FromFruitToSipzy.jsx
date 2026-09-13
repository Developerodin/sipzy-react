import { useRef } from 'react'
import { fruitFlavours } from '../data/fruitFlavours'
import { useFruitToSipzy } from '../hooks/useFruitToSipzy'

const initial = fruitFlavours[0]

export default function FromFruitToSipzy() {
  const sectionRef = useRef(null)
  useFruitToSipzy(sectionRef)

  return (
    <section
      ref={sectionRef}
      className="fruit-to-sipzy"
      id="from-fruit"
      data-fruit-to-sipzy
      aria-labelledby="fts-heading"
    >
      <div className="fts-sticky">
        <div className="fts-bg" data-fts-bg aria-hidden="true" />

        <div className="fts-stage" data-fts-stage aria-hidden="true">
          <div className="fts-bottle" data-fts-bottle>
            <div className="fts-bottle-inner">
              <img
                data-fts-bottle-img
                src={initial.bottle}
                alt=""
                width="1254"
                height="1254"
                decoding="async"
              />
            </div>
          </div>

          <div className="fts-frags" data-fts-frags>
            {Array.from({ length: 6 }, (_, i) => (
              <div className="fts-frag" data-fts-frag key={i}>
                <div className="fts-frag-inner">
                  <img alt="" decoding="async" src={initial.fruit} />
                </div>
              </div>
            ))}
          </div>

          <div className="fts-fruit fts-fruit--main" data-fts-fruit>
            <div className="fts-float">
              <img
                data-fts-fruit-img
                src={initial.fruit}
                alt=""
                width="577"
                height="577"
                decoding="async"
              />
            </div>
          </div>

          <div className="fts-fruit fts-fruit--next" data-fts-next>
            <div className="fts-float">
              <img data-fts-next-img alt="" decoding="async" />
            </div>
          </div>
        </div>

        <div className="fts-copy">
          <div className="fts-opener" data-fts-opener>
            <p className="kicker">From fruit to Sipzy</p>
            <h2 id="fts-heading">It starts with a mood.</h2>
            <p className="fts-support">
              Fruit-forward flavours. Ready when the moment is.
            </p>
          </div>
          <p className="fts-phase" data-fts-phase>
            The flavour
          </p>
          <div className="fts-reveal" data-fts-reveal>
            <p className="fts-reveal-name" data-fts-name>
              {initial.name}
            </p>
            <p className="fts-reveal-meta" data-fts-meta>
              {initial.meta}
            </p>
            <p className="fts-reveal-line" data-fts-line>
              {initial.line}
            </p>
          </div>
          <p className="fts-blurb" data-fts-blurb>
            {initial.description}
          </p>
        </div>

        <p className="fts-sr" data-fts-live aria-live="polite" />
      </div>
      <div className="fts-spacer" data-fts-spacer aria-hidden="true" />
    </section>
  )
}
