import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

const reviewLines = [
  {
    text: 'I was basically trying to explain the project and, um, the impact.',
    mark: 'filler',
  },
  {
    text: 'The stronger version: “I explained the project, then showed the impact.”',
    mark: 'fix',
  },
  {
    text: 'You have the evidence. Now land the sentence earlier.',
    mark: 'note',
  },
]

function Home() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="Peitho home">
          <span>PEITHO</span>
          <small>πειθώ</small>
        </a>
        <div className="nav-actions">
          <a href="#method">Method</a>
          <a href="#review">Sample review</a>
          <button type="button" className="button button-small">
            Continue with Google
          </button>
        </div>
      </nav>

      <section id="top" className="hero shell">
        <div className="eyebrow">THE SPEAKING GYM</div>
        <h1>
          Speak so
          <br />
          <em>they listen.</em>
        </h1>
        <p className="lede">
          Talk for five minutes. Peitho marks the fillers, pace, grammar and habits that blur your
          point, then rewrites the moments that matter using your own words.
        </p>
        <div className="hero-actions">
          <button type="button" className="button">
            Start a speaking session <span>→</span>
          </button>
          <a href="#review" className="text-link">
            See how feedback works
          </a>
        </div>
        <div className="proof-row" aria-label="Product principles">
          <div>
            <strong>05:00</strong>
            <span>focused practice</span>
          </div>
          <div>
            <strong>Your words</strong>
            <span>quoted as evidence</span>
          </div>
          <div>
            <strong>No fluff</strong>
            <span>three fixes to carry forward</span>
          </div>
        </div>
      </section>

      <section id="review" className="review-section shell">
        <div className="section-heading">
          <div className="eyebrow">A REVIEW THAT COULD ONLY BE YOURS</div>
          <h2>Not a score. A marked-up rehearsal.</h2>
        </div>
        <div className="review-card">
          <div className="review-topline">
            <div>
              <span className="score">B+</span>
              <span className="score-label">
                Clear idea.
                <br />
                Loose landing.
              </span>
            </div>
            <div className="metrics">
              <span>
                <b>7</b> fillers
              </span>
              <span>
                <b>164</b> wpm
              </span>
              <span>
                <b>3</b> long pauses
              </span>
            </div>
          </div>
          <div className="transcript">
            {reviewLines.map((line) => (
              <p key={line.text} className={line.mark}>
                {line.text}
              </p>
            ))}
          </div>
          <div className="fixes">
            <span>TOP FIX / 01</span>
            <strong>Replace runway words with the claim.</strong>
            <p>Your best answers already know where they are going. Start there.</p>
          </div>
        </div>
      </section>

      <section id="method" className="method shell">
        <div className="section-heading compact">
          <div className="eyebrow">HOW A SESSION WORKS</div>
          <h2>Practice. Notice. Repeat.</h2>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <h3>Pick a real topic</h3>
            <p>Interview, work, everyday or opinion prompts. Custom topics are welcome.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Speak out loud</h3>
            <p>A five-minute cap keeps the practice honest. Live pace, fillers and pauses stay visible.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Keep three fixes</h3>
            <p>Peitho turns your transcript into specific corrections and phrases worth rehearsing again.</p>
          </article>
        </div>
      </section>

      <footer className="footer shell">
        <div className="brand">
          <span>PEITHO</span>
          <small>πειθώ</small>
        </div>
        <p>Named for the Greek goddess of persuasion.</p>
        <p className="footer-note">Scaffold · TanStack Start · Vercel</p>
      </footer>
    </main>
  )
}
