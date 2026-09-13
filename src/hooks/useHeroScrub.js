import { useEffect } from 'react'

const VIDEO_SOURCES = {
  mobile: '/assets/video/sipzy-scroll-hero-mobile.mp4',
  desktop: '/assets/video/sipzy-scroll-hero-web.mp4',
}

/**
 * Port of vanilla hero video scrub + header/cover state.
 * Operates on DOM inside sectionRef (must contain vanilla data-* hooks).
 */
export function useHeroScrub(sectionRef) {
  useEffect(() => {
    const hero = sectionRef.current
    if (!hero) return undefined

    const sticky = hero.querySelector('.hero-sticky')
    const spacer = hero.querySelector('[data-scrub-spacer]')
    const firstCover = hero.querySelector('.section-cover')
    const video = hero.querySelector('[data-scroll-video]')
    const progressBar = hero.querySelector('[data-progress]')
    const stages = [...hero.querySelectorAll('[data-stage]')]
    const header = document.querySelector('[data-header]')
    if (!sticky || !spacer || !video || !progressBar || !header) return undefined

    const mobileQuery = window.matchMedia('(max-width: 640px)')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let duration = 12
    let targetTime = 0
    let activeStage = 0
    let ticking = false
    let seeking = false
    let seekStarted = 0
    let rafId = 0
    let alive = true

    function activeSource() {
      return mobileQuery.matches ? VIDEO_SOURCES.mobile : VIDEO_SOURCES.desktop
    }

    function applyVideoSource() {
      const next = new URL(activeSource(), window.location.href).href
      if (video.currentSrc === next || video.src === next) return
      if (!video.currentSrc && !video.src) return
      video.src = next
      video.load()
    }

    function syncDuration() {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        duration = video.duration
      }
    }

    function paintHeroFrame() {
      if (!alive) return
      syncDuration()
      video.pause()
      seeking = false
      if (video.readyState >= 2) video.currentTime = targetTime
    }

    function scrubDistance() {
      return Math.max(
        1,
        sticky.offsetHeight + spacer.offsetHeight - window.innerHeight,
      )
    }

    function heroProgress() {
      return Math.min(
        1,
        Math.max(0, (window.scrollY - hero.offsetTop) / scrubDistance()),
      )
    }

    function stageFromProgress(progress) {
      if (progress < 0.24) return 0
      if (progress < 0.5) return 1
      if (progress < 0.76) return 2
      return 3
    }

    function updatePageState() {
      if (!alive) return
      syncDuration()
      const progress = heroProgress()
      targetTime = progress * duration
      progressBar.style.transform = `scaleX(${progress})`

      const nextStage = stageFromProgress(progress)
      if (nextStage !== activeStage) {
        stages[activeStage]?.classList.remove('is-active')
        stages[nextStage]?.classList.add('is-active')
        activeStage = nextStage
      }

      header.classList.toggle(
        'is-scrolled',
        window.scrollY >
          hero.offsetTop +
            sticky.offsetHeight +
            spacer.offsetHeight -
            window.innerHeight * 0.6,
      )

      if (firstCover) {
        const coverTop = firstCover.getBoundingClientRect().top
        const stickyBottom = sticky.getBoundingClientRect().bottom
        hero.classList.toggle(
          'is-covered',
          !reduceMotion.matches &&
            coverTop < window.innerHeight * 0.98 &&
            stickyBottom > 0,
        )
      }
      ticking = false
    }

    function bufferedEnd() {
      if (!video.buffered.length) return 0
      return video.buffered.end(video.buffered.length - 1)
    }

    function scrubVideo() {
      if (!alive) return
      if (seeking && performance.now() - seekStarted > 90) seeking = false
      if (video.readyState >= 2 && !seeking) {
        const maxTime = Math.min(targetTime, Math.max(0, bufferedEnd() - 0.04))
        const delta = maxTime - video.currentTime
        if (Math.abs(delta) > 0.02) {
          seeking = true
          seekStarted = performance.now()
          video.currentTime =
            Math.abs(delta) > 0.08 ? maxTime : video.currentTime + delta * 0.5
        }
      }
      rafId = requestAnimationFrame(scrubVideo)
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updatePageState)
      }
    }

    const onBreakpointChange = () => {
      applyVideoSource()
      updatePageState()
    }

    const unlockVideo = () => {
      video.play().then(() => video.pause()).catch(() => {})
    }

    video.addEventListener('loadedmetadata', paintHeroFrame)
    video.addEventListener('loadeddata', paintHeroFrame)
    video.addEventListener('canplay', paintHeroFrame)
    video.addEventListener('seeked', () => {
      seeking = false
    })
    mobileQuery.addEventListener('change', onBreakpointChange)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onBreakpointChange)
    window.addEventListener('pointerdown', unlockVideo, {
      once: true,
      passive: true,
    })
    window.addEventListener('touchstart', unlockVideo, {
      once: true,
      passive: true,
    })

    applyVideoSource()
    updatePageState()
    rafId = requestAnimationFrame(scrubVideo)

    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      video.removeEventListener('loadedmetadata', paintHeroFrame)
      video.removeEventListener('loadeddata', paintHeroFrame)
      video.removeEventListener('canplay', paintHeroFrame)
      mobileQuery.removeEventListener('change', onBreakpointChange)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onBreakpointChange)
      window.removeEventListener('pointerdown', unlockVideo)
      window.removeEventListener('touchstart', unlockVideo)
    }
  }, [sectionRef])
}
