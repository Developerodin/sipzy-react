export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <a className="footer-wordmark" href="#top" aria-label="Sipzy home">
        <img src="/assets/sipzy-logo-white.svg" alt="" />
      </a>
      <p>Pre-mixed cocktails for fruit-forward moods.</p>
      <div className="footer-links">
        <a href="#find">Find</a>
        <a href="#range">Range</a>
        <a href="#story">Story</a>
        <a href="#ritual">Serve</a>
      </div>
      <p className="legal">
        For adults of legal drinking age only. Legal drinking age varies by
        location. Please enjoy responsibly.
      </p>
    </footer>
  )
}
