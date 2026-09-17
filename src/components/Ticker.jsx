const LINES = [
  'Sip. Chill. Repeat.',
  'Fruit-forward moods.',
  'Pop. Sip. Repeat.',
  'Fruit with a Kick.',
  '8% Easy. 16% Bold.',
  'Pick your mood.',
]

function LinePair({ text, hidden = false }) {
  if (hidden) {
    return (
      <>
        <span aria-hidden="true">{text}</span>
        <i aria-hidden="true">✦</i>
      </>
    )
  }
  return (
    <>
      <span>{text}</span>
      <i>✦</i>
    </>
  )
}

export default function Ticker() {
  return (
    <section
      className="ticker section-cover"
      aria-label="Sipzy brand line"
    >
      <div className="ticker-track">
        <div className="ticker-group">
          {LINES.map((text) => (
            <LinePair key={text} text={text} />
          ))}
          {LINES.map((text) => (
            <LinePair key={`h-${text}`} text={text} hidden />
          ))}
        </div>
        <div className="ticker-group" aria-hidden="true">
          {[...LINES, ...LINES].map((text, i) => (
            <LinePair key={`d-${i}`} text={text} />
          ))}
        </div>
      </div>
    </section>
  )
}
