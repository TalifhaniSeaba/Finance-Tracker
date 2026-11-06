import Link from "next/link";

const features = [
  {
    icon: "↗",
    title: "Track every transaction",
    description:
      "Record income and expenses, edit mistakes, and keep your complete financial history in one place.",
  },
  {
    icon: "◌",
    title: "See the bigger picture",
    description:
      "Understand your balance with clear income-versus-expense trends, summaries, and date-range insights.",
  },
  {
    icon: "⌁",
    title: "Make spending meaningful",
    description:
      "Organize transactions by categories like food, rent, transport, and healthcare to spot habits quickly.",
  },
  {
    icon: "▣",
    title: "Stay ahead of budgets",
    description:
      "Set category limits, monitor progress, and receive an alert before a small overspend becomes a pattern.",
  },
  {
    icon: "◎",
    title: "Reach savings goals",
    description:
      "Create goals with target amounts and deadlines, then watch progress grow alongside your everyday activity.",
  },
  {
    icon: "↓",
    title: "Take your insights with you",
    description:
      "Generate monthly reports with charts and insights, then export them for your own records or planning.",
  },
];

const categoryBreakdown = [
  { name: "Home", value: "42%", width: "42%", className: "category-home" },
  { name: "Food", value: "26%", width: "26%", className: "category-food" },
  { name: "Travel", value: "18%", width: "18%", className: "category-travel" },
  { name: "Other", value: "14%", width: "14%", className: "category-other" },
];

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>FINATS</span>
        </Link>

        <div className="landing-nav__links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </div>

        <div className="landing-nav__actions">
          <Link className="button button--text" href="/login">Log in</Link>
          <Link className="button button--small" href="/signup">Get started</Link>
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__content">
          <p className="eyebrow"><span className="eyebrow__dot" /> A clearer way to manage money</p>
          <h1 id="hero-heading">Your money,<br /><em>in focus.</em></h1>
          <p className="hero__description">
            Track your spending, build better habits, and make confident decisions with a finance tracker designed around your life.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/signup">
              Start for free <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button--outline" href="/login">I already have an account</Link>
          </div>
          <p className="hero__note">Secure account access · Built for everyday clarity</p>
        </div>

        <div className="dashboard-preview" aria-label="Example finance dashboard preview">
          <div className="preview-glow" />
          <div className="preview-window">
            <div className="preview-window__topbar">
              <span className="preview-brand"><span className="brand-mark brand-mark--mini"><span /><span /><span /></span> FINATS</span>
              <span className="preview-avatar">TS</span>
            </div>
            <div className="preview-window__body">
              <div className="preview-heading">
                <div>
                  <p className="preview-kicker">Overview</p>
                  <h2>Good morning, Tali</h2>
                </div>
                <span className="preview-date">This month⌄</span>
              </div>
              <div className="preview-metrics">
                <div className="preview-metric preview-metric--main">
                  <span>Total balance</span>
                  <strong>R 24,680.00</strong>
                  <small><b>+12.8%</b> from last month</small>
                </div>
                <div className="preview-metric">
                  <span>Income</span>
                  <strong>R 18,420</strong>
                  <small className="preview-positive">↗ On track</small>
                </div>
                <div className="preview-metric">
                  <span>Expenses</span>
                  <strong>R 9,840</strong>
                  <small>68% of budget</small>
                </div>
              </div>
              <div className="preview-panels">
                <div className="preview-chart">
                  <div className="preview-panel-title"><span>Cash flow</span><span className="preview-legend"><i /> Income <i /> Expenses</span></div>
                  <div className="chart-area">
                    <div className="chart-grid"><span /><span /><span /><span /></div>
                    <svg viewBox="0 0 420 150" role="img" aria-label="Income and expense trend chart" preserveAspectRatio="none">
                      <path className="chart-line chart-line--income" d="M0 112 C35 100, 55 78, 88 92 S145 104, 176 62 S225 77, 257 48 S310 68, 341 32 S380 48, 420 12" />
                      <path className="chart-line chart-line--expense" d="M0 132 C36 124, 62 130, 90 112 S144 118, 177 94 S220 111, 257 86 S307 102, 341 78 S383 90, 420 64" />
                    </svg>
                  </div>
                  <div className="chart-labels"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></div>
                </div>
                <div className="preview-categories">
                  <div className="preview-panel-title"><span>Spending</span><span>View all →</span></div>
                  <div className="donut-wrap"><div className="donut-chart"><span>R 9.8k<small>total</small></span></div></div>
                  <div className="category-list">
                    {categoryBreakdown.map((category) => (
                      <div className="category-row" key={category.name}>
                        <span className={`category-dot ${category.className}`} />
                        <span>{category.name}</span><b>{category.value}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product benefits">
        <span>One calm place for your finances</span>
        <span>Income & expenses</span>
        <span>Budgets & alerts</span>
        <span>Savings goals</span>
        <span>Reports & insights</span>
      </section>

      <section className="features-section" id="features" aria-labelledby="features-heading">
        <div className="section-heading">
          <p className="eyebrow">Everything in one view</p>
          <h2 id="features-heading">Less guesswork.<br /><em>More direction.</em></h2>
            <p>From the daily details to the long-term goals, FINATS gives your money a simple structure you can actually keep up with.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-card__icon" aria-hidden="true">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="feature-card__arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="how-it-works" aria-labelledby="workflow-heading">
        <div className="workflow-copy">
          <p className="eyebrow">A better financial rhythm</p>
          <h2 id="workflow-heading">Your next good decision starts with <em>knowing.</em></h2>
          <p>FINATS turns scattered transactions into a clear picture, then gives you the tools to do something useful with it.</p>
          <Link className="text-link" href="/signup">Build your clearer money routine <span aria-hidden="true">→</span></Link>
        </div>
        <div className="workflow-steps">
          <div className="workflow-step"><span>01</span><div><h3>Connect the dots</h3><p>Capture what comes in and what goes out, with categories that make sense.</p></div></div>
          <div className="workflow-step"><span>02</span><div><h3>Spot the pattern</h3><p>Use trends, summaries, and alerts to understand what your money is saying.</p></div></div>
          <div className="workflow-step"><span>03</span><div><h3>Move with intention</h3><p>Set a budget, grow a goal, or export a report when you are ready to act.</p></div></div>
        </div>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <div>
          <p className="eyebrow">Start with clarity</p>
          <h2 id="cta-heading">A healthier relationship<br />with your money.</h2>
        </div>
        <Link className="button button--light" href="/signup">Create your free account <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="landing-footer">
        <Link className="brand" href="/">FINATS</Link>
        <span>Track today. Plan tomorrow.</span>
        <span>© 2026 FINATS.</span>
      </footer>
    </main>
  );
}
