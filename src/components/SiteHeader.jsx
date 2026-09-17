export default function SiteHeader() {
  return (
    <header className="site-header" data-header data-theme="dark">
      <a className="wordmark" href="#top" aria-label="Sipzy home">
        <img
          className="wordmark-logo wordmark-logo--white"
          src="/assets/sipzy-logo-white.svg"
          alt=""
        />
        <img
          className="wordmark-logo wordmark-logo--black"
          src="/assets/sipzy-logo-black.svg"
          alt=""
        />
      </a>
      <nav aria-label="Primary navigation">
        <a href="#find">Find yours</a>
        <a href="#range">The range</a>
        <a href="#story">Our mood</a>
        <a href="#ritual">How to Sipzy</a>
      </nav>
      <a className="header-pill" href="#contact">
        Say hello <span aria-hidden="true">↗</span>
      </a>
    </header>
  )
}
