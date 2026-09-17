/**
 * Asset preload gates for Hero video + FTS fruit/bottle images.
 * Encodes path segments so filenames with spaces resolve reliably.
 */

const imageCache = new Map()

/** Encode each path segment; keep leading slash and protocol intact. */
export function encodeAssetUrl(src) {
  if (!src) return src
  try {
    if (/^https?:\/\//i.test(src)) {
      const url = new URL(src)
      url.pathname = url.pathname
        .split('/')
        .map((part) => (part ? encodeURIComponent(decodeURIComponent(part)) : ''))
        .join('/')
      return url.href
    }
  } catch {
    // fall through
  }
  return src
    .split('/')
    .map((part, i) => {
      if (i === 0 && part === '') return ''
      if (!part) return ''
      try {
        return encodeURIComponent(decodeURIComponent(part))
      } catch {
        return encodeURIComponent(part)
      }
    })
    .join('/')
}

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function preloadImage(src) {
  const url = encodeAssetUrl(src)
  if (!url) return Promise.reject(new Error('empty image src'))
  const cached = imageCache.get(url)
  if (cached) return cached

  const promise = new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') await img.decode()
      } catch {
        // decode can fail on some browsers; onload is enough
      }
      resolve(img)
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })

  imageCache.set(url, promise)
  return promise
}

/**
 * Wait until a video element can scrub (HAVE_CURRENT_DATA+) and has duration.
 * @param {HTMLVideoElement} video
 * @param {{ src?: string, timeoutMs?: number }} [options]
 * @returns {Promise<HTMLVideoElement>}
 */
export function preloadVideo(video, options = {}) {
  const { src, timeoutMs = 20000 } = options

  return new Promise((resolve, reject) => {
    if (!video) {
      reject(new Error('No video element'))
      return
    }

    let settled = false
    const timer = window.setTimeout(() => {
      cleanup()
      if (!settled) {
        settled = true
        reject(new Error('Video preload timed out'))
      }
    }, timeoutMs)

    function ready() {
      const durationOk =
        Number.isFinite(video.duration) && video.duration > 0
      if (video.readyState >= 2 && durationOk) {
        cleanup()
        if (!settled) {
          settled = true
          resolve(video)
        }
        return true
      }
      return false
    }

    function onProgress() {
      ready()
    }

    function onError() {
      cleanup()
      if (!settled) {
        settled = true
        reject(new Error('Video failed to load'))
      }
    }

    function cleanup() {
      window.clearTimeout(timer)
      video.removeEventListener('loadedmetadata', onProgress)
      video.removeEventListener('loadeddata', onProgress)
      video.removeEventListener('canplay', onProgress)
      video.removeEventListener('canplaythrough', onProgress)
      video.removeEventListener('error', onError)
    }

    video.addEventListener('loadedmetadata', onProgress)
    video.addEventListener('loadeddata', onProgress)
    video.addEventListener('canplay', onProgress)
    video.addEventListener('canplaythrough', onProgress)
    video.addEventListener('error', onError)

    if (src) {
      const next = new URL(src, window.location.href).href
      if (video.currentSrc !== next && video.src !== next) {
        video.src = src
        video.load()
      }
    }

    if (ready()) return
  })
}

/**
 * @param {{ fruit: string, bottle: string }} flavour
 */
export function preloadFruitFlavour(flavour) {
  return Promise.all([
    preloadImage(flavour.fruit),
    preloadImage(flavour.bottle),
  ])
}

/**
 * @param {Array<{ fruit: string, bottle: string }>} flavours
 */
export function preloadAllFruitFlavours(flavours) {
  return Promise.all(flavours.map((f) => preloadFruitFlavour(f)))
}
