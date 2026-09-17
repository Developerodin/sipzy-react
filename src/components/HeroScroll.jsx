import { useRef } from 'react'
import { useHeroScrub } from '../hooks/useHeroScrub'
import Ticker from './Ticker'

export default function HeroScroll() {
  const sectionRef = useRef(null)
  useHeroScrub(sectionRef)

  return (
    <section
      id="top"
      className="hero-scroll"
      ref={sectionRef}
      aria-label="Sipzy Jamun Shot scroll film"
    >
      <div className="hero-sticky">
        <video
          className="hero-video"
          data-scroll-video
          muted
          playsInline
          preload="auto"
          poster="/assets/hero-poster.png"
          aria-label="A Sipzy Jamun Shot bottle floating through a purple world and joining the full flavour range"
        >
          <source
            src="/assets/video/sipzy-scroll-hero-mobile.mp4"
            type="video/mp4"
            media="(max-width: 640px)"
          />
          <source
            src="/assets/video/sipzy-scroll-hero-web.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero-shade" />
        <div className="hero-progress" aria-hidden="true">
          <i data-progress />
        </div>

        <div className="hero-copy" aria-live="polite">
          <p className="eyebrow">Pre-mixed cocktails · 8% & 16% ABV</p>
          <div className="hero-stage is-active" data-stage="0">
            <h1>
              A little fruit.
              <br />
              <em>A lot of mood.</em>
            </h1>
            <p>
              Made to float into the plan—and turn the plan into a story.
            </p>
          </div>
          <div className="hero-stage" data-stage="1">
            <h2>
              Easy drift.
              <br />
              <em>Bold arrival.</em>
            </h2>
            <p>
              Choose 8% for the easy flow or 16% when the night wants more.
            </p>
          </div>
          <div className="hero-stage hero-stage--final" data-stage="2">
            <h2>Meet the moods.</h2>
            <a href="#range" className="round-link">
              Explore all flavours <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span>Scroll to pour</span>
          <i />
        </div>
      </div>
      <div className="hero-scrub-spacer" aria-hidden="true" data-scrub-spacer />
      <Ticker />
    </section>
  )
}
