import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useScroll } from '../context/ScrollContext'
import { preloadVideo } from '../lib/preloadAssets'

gsap.registerPlugin(ScrollTrigger)

const VIDEO_SOURCES = {
  mobile: '/assets/video/sipzy-scroll-hero-mobile.mp4',
  desktop: '/assets/video/sipzy-scroll-hero-web.mp4',
}

/** Soft-snap notches: equal thirds — Fruit → Easy drift → Meet the moods. */
const STAGE_SNAPS = [0, 1 / 3, 2 / 3]

/**
 * Hero video scrub via GSAP ScrollTrigger + Lenis soft-snap stage points.
 * Blocks scrub seeks until the active video source is ready.
 */
export function useHeroScrub(sectionRef) {
  const { registerSnapPoints } = useScroll()

  useEffect(() => {
    const hero = sectionRef.current
    if (!hero) return undefined

    const sticky = hero.querySelector('.hero-sticky')
    const spacer = hero.querySelector('[data-scrub-spacer]')
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
    let seeking = false
    let seekStarted = 0
    let rafId = 0
    let alive = true
    let assetsReady = false
    let trigger = null
    let loadGen = 0

    function activeSource() {
      return mobileQuery.matches ? VIDEO_SOURCES.mobile : VIDEO_SOURCES.desktop
    }

    function scrubDistance() {
      return Math.max(
        1,
        sticky.offsetHeight + spacer.offsetHeight - window.innerHeight,
      )
    }

    function progressToScrollY(progress) {
      return hero.offsetTop + progress * scrubDistance()
    }

    function scrubEndY() {
      return hero.offsetTop + scrubDistance()
    }

    function stageFromProgress(progress) {
      if (progress < 1 / 3) return 0
      if (progress < 2 / 3) return 1
      return 2
    }

    function syncDuration() {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        duration = video.duration
      }
    }

    function bufferedEnd() {
      if (!video.buffered.length) return 0
      return video.buffered.end(video.buffered.length - 1)
    }

    function applyPageChrome(progress) {
      progressBar.style.transform = `scaleX(${progress})`

      const nextStage = stageFromProgress(progress)
      if (nextStage !== activeStage) {
        stages[activeStage]?.classList.remove('is-active')
        stages[nextStage]?.classList.add('is-active')
        activeStage = nextStage
      }

      // Solid only after leaving the scrub range — last snap is at scrubEndY(),
      // so `> scrubEndY() - 1` wrongly painted the black bar on Meet the moods.
      const pastHero = window.scrollY > scrubEndY() + 1
      header.classList.toggle('is-solid', pastHero)
      header.classList.toggle('is-scrolled', pastHero)
      header.setAttribute('data-theme', 'dark')
    }

    function paintFromProgress(progress) {
      if (!alive) return
      syncDuration()
      if (assetsReady && !reduceMotion.matches) {
        targetTime = progress * duration
      } else {
        targetTime = 0
      }
      applyPageChrome(progress)
    }

    function scrubVideoLoop() {
      if (!alive) return
      if (!assetsReady || reduceMotion.matches) {
        rafId = requestAnimationFrame(scrubVideoLoop)
        return
      }
      if (seeking && performance.now() - seekStarted > 120) seeking = false
      const maxTime = Math.min(targetTime, Math.max(0, bufferedEnd() - 0.04))
      const absDelta = Math.abs(maxTime - video.currentTime)
      if (video.readyState >= 2 && absDelta > 0.02 && (!seeking || absDelta > 0.08)) {
        seeking = true
        seekStarted = performance.now()
        video.currentTime = maxTime
      }
      rafId = requestAnimationFrame(scrubVideoLoop)
    }

    function killTrigger() {
      if (trigger) {
        trigger.kill()
        trigger = null
      }
    }

    function createTrigger() {
      killTrigger()
      if (reduceMotion.matches) {
        paintFromProgress(0)
        return
      }

      trigger = ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: () => `+=${scrubDistance()}`,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          paintFromProgress(self.progress)
        },
        onRefresh: (self) => {
          paintFromProgress(self.progress)
        },
      })
    }

    async function loadActiveVideo() {
      const gen = ++loadGen
      assetsReady = false
      hero.removeAttribute('data-assets-ready')
      video.pause()

      if (reduceMotion.matches) {
        assetsReady = true
        hero.setAttribute('data-assets-ready', '')
        paintFromProgress(0)
        return
      }

      const src = activeSource()
      try {
        await preloadVideo(video, { src })
        if (!alive || gen !== loadGen) return
        syncDuration()
        video.pause()
        if (video.readyState >= 2) video.currentTime = 0
        assetsReady = true
        hero.setAttribute('data-assets-ready', '')
        createTrigger()
        ScrollTrigger.refresh()
        if (trigger) paintFromProgress(trigger.progress)
      } catch {
        if (!alive || gen !== loadGen) return
        // Allow chrome updates even if video failed; keep frame at 0.
        assetsReady = false
        createTrigger()
        ScrollTrigger.refresh()
      }
    }

    const unregisterSnaps = registerSnapPoints('hero', () => {
      if (reduceMotion.matches) return []
      const activeMin = hero.offsetTop
      const activeMax = scrubEndY()
      // Inactive once past scrub end — soft-snap must not yank back from Ritual.
      return STAGE_SNAPS.map((p) => ({
        y: progressToScrollY(p),
        activeMin,
        activeMax,
      }))
    })

    const unlockVideo = () => {
      video.play().then(() => video.pause()).catch(() => {})
    }

    const onBreakpointChange = () => {
      loadActiveVideo()
    }

    const onReducedChange = () => {
      if (reduceMotion.matches) {
        killTrigger()
        assetsReady = true
        hero.setAttribute('data-assets-ready', '')
        paintFromProgress(0)
      } else {
        loadActiveVideo()
      }
      ScrollTrigger.refresh()
    }

    const syncHeaderPastHero = () => {
      const pastHero = window.scrollY > scrubEndY() + 1
      header.classList.toggle('is-solid', pastHero)
      header.classList.toggle('is-scrolled', pastHero)
      header.setAttribute('data-theme', 'dark')
    }

    video.addEventListener('seeked', () => {
      seeking = false
    })
    mobileQuery.addEventListener('change', onBreakpointChange)
    reduceMotion.addEventListener('change', onReducedChange)
    window.addEventListener('scroll', syncHeaderPastHero, { passive: true })
    window.addEventListener('pointerdown', unlockVideo, {
      once: true,
      passive: true,
    })
    window.addEventListener('touchstart', unlockVideo, {
      once: true,
      passive: true,
    })

    stages[0]?.classList.add('is-active')
    paintFromProgress(0)
    syncHeaderPastHero()
    loadActiveVideo()
    rafId = requestAnimationFrame(scrubVideoLoop)

    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      killTrigger()
      unregisterSnaps()
      mobileQuery.removeEventListener('change', onBreakpointChange)
      reduceMotion.removeEventListener('change', onReducedChange)
      window.removeEventListener('scroll', syncHeaderPastHero)
      window.removeEventListener('pointerdown', unlockVideo)
      window.removeEventListener('touchstart', unlockVideo)
      hero.removeAttribute('data-assets-ready')
    }
  }, [sectionRef, registerSnapPoints])
}
