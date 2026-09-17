import { useEffect, useRef, useState } from 'react'
import { products } from '../data/products'
import { getPrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function RangeSection() {
  const railRef = useRef(null)
  const sectionRef = useRef(null)
  const observerRef = useRef(null)
  const [range, setRange] = useState('8')

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            observerRef.current?.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8%' },
    )
    return () => observerRef.current?.disconnect()
  }, [])

  useEffect(() => {
    const rail = railRef.current
    const section = sectionRef.current
    if (!rail || !section) return

    const observer = observerRef.current
    const list = products[range]
    const size = range === '8' ? '275 ml' : '330 ml'
    const isBold = range === '16'

    section.classList.toggle('is-bold', isBold)

    const intro = section.querySelector('[data-range-intro]')
    const count = section.querySelector('[data-range-count]')
    if (intro) {
      intro.textContent = isBold
        ? 'Five deeper expressions in the taller 330 ml bottle—made for after-dark energy.'
        : 'Seven bright flavours in the compact 275 ml bottle—made for the easy drift.'
    }
    if (count) {
      count.textContent = isBold ? '01—05' : '01—07'
    }

    rail.querySelectorAll('.product-card').forEach((card) => {
      observer?.unobserve(card)
    })

    rail.innerHTML = list
      .map(
        (product, index) => `
      <article class="product-card" data-index="${String(index + 1).padStart(2, '0')}">
        <img src="/assets/products-webp/${range}/${product.image}" alt="Sipzy ${product.name} ${range}% bottle" loading="lazy">
        <div class="product-card-content">
          <small>${range}% ABV · ${size}</small>
          <h3>${product.name}</h3>
          <p>${product.note}</p>
        </div>
      </article>
    `,
      )
      .join('')

    rail.scrollTo({
      left: 0,
      behavior: getPrefersReducedMotion() ? 'auto' : 'smooth',
    })

    requestAnimationFrame(() => {
      rail.querySelectorAll('.product-card').forEach((card, index) => {
        card.style.setProperty('--delay', `${index * 70}ms`)
        if (getPrefersReducedMotion()) {
          card.classList.add('is-in')
          return
        }
        observer?.observe(card)
      })
    })
  }, [range])

  function onRangeClick(next) {
    if (next === range) return
    const rail = railRef.current
    if (!rail || getPrefersReducedMotion() || !rail.innerHTML.trim()) {
      setRange(next)
      return
    }

    let swapped = false
    const finish = (event) => {
      if (event && event.target !== rail) return
      if (swapped) return
      swapped = true
      rail.removeEventListener('transitionend', finish)
      setRange(next)
      requestAnimationFrame(() => {
        rail.classList.remove('is-swapping')
      })
    }

    rail.classList.add('is-swapping')
    rail.addEventListener('transitionend', finish)
    window.setTimeout(() => finish(), 320)
  }

  return (
    <section
      className="range-section section-pad"
      id="range"
      ref={sectionRef}
    >
      <div className="section-head reveal">
        <div>
          <p className="kicker">Choose your mood</p>
          <h2>The Sipzy range</h2>
        </div>
        <div className="range-toggle" role="group" aria-label="Choose alcohol range">
          <button
            type="button"
            data-range="8"
            className={range === '8' ? 'is-active' : undefined}
            onClick={() => onRangeClick('8')}
          >
            8% Easy
          </button>
          <button
            type="button"
            data-range="16"
            className={range === '16' ? 'is-active' : undefined}
            onClick={() => onRangeClick('16')}
          >
            16% Bold
          </button>
        </div>
      </div>

      <div className="range-meta reveal">
        <p data-range-intro>
          Seven bright flavours in the compact 275 ml bottle—made for the
          easy drift.
        </p>
        <span data-range-count>01—07</span>
      </div>
      <div className="product-rail" data-product-rail ref={railRef} aria-live="polite" />
    </section>
  )
}
