import Link from "next/link";

const flow = [
  {
    n: "01",
    title: "Tenant pays",
    body: "Rent, water, or service charge — paid by M-Pesa, bank, or card, straight from the tenant's phone.",
  },
  {
    n: "02",
    title: "RentFile reconciles",
    body: "Every payment is matched to the right unit and bill automatically. No screenshots forwarded on WhatsApp.",
  },
  {
    n: "03",
    title: "Landlord sees it live",
    body: "The ledger updates in real time — who's paid, who's late, and what's still outstanding, per property.",
  },
  {
    n: "04",
    title: "A receipt is filed",
    body: "Both sides get a dated, searchable record. Nothing depends on someone's memory in month six.",
  },
];

const features = [
  {
    title: "One ledger, both sides",
    body: "Landlords and tenants look at the same numbers — no separate spreadsheets that quietly disagree.",
  },
  {
    title: "Bills beyond rent",
    body: "Water, garbage, service charge, and one-off levies, each tracked and filed on its own line.",
  },
  {
    title: "Reminders that land",
    body: "SMS and push nudges before rent is due, not apologetic messages after it's late.",
  },
  {
    title: "Maintenance, logged",
    body: "A tenant reports it, a landlord sees it, and the record doesn't disappear into a phone call.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden bg-bg text-fg">
      <div className="pointer-events-none absolute inset-0 bg-grain bg-[length:18px_18px] opacity-40" />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl italic tracking-tight text-fg">
            RentFile
          </span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/login?role=tenant"
            className="rounded-full px-4 py-2 text-muted transition hover:text-fg"
          >
            Tenant sign in
          </Link>
          <Link
            href="/login?role=landlord"
            className="rounded-full border border-line bg-bg-alt px-4 py-2 font-medium text-fg transition hover:border-accent hover:text-accent"
          >
            Landlord sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-10 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
        <div>
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Rent &amp; bill records, filed properly
          </p>
          <h1 className="font-display text-[2.75rem] italic leading-[1.05] text-fg sm:text-6xl">
            Every shilling,
            <br />
            <span className="not-italic text-accent">filed the day it moves.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            RentFile is the shared ledger for landlords and tenants — rent,
            water, service charge, and every receipt, in one record neither
            side has to chase.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/signup?role=landlord"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-bg transition hover:brightness-110"
            >
              I'm a landlord
            </Link>
            <Link
              href="/signup?role=tenant"
              className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent"
            >
              I'm a tenant
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted">
            No paperwork to switch over. Add a property, invite tenants, and
            the ledger starts itself.
          </p>
        </div>

        {/* Signature element: stacked, filed receipt cards */}
        <div className="relative mx-auto h-[360px] w-full max-w-sm sm:h-[420px]">
          {[
            { label: "Water — Unit 4B", amount: "KES 900", rot: "-6deg", top: "top-0", delay: "0ms" },
            { label: "Service charge", amount: "KES 3,500", rot: "3deg", top: "top-16", delay: "120ms" },
            { label: "Rent — July", amount: "KES 28,000", rot: "-2deg", top: "top-32", delay: "240ms" },
          ].map((card) => (
            <div
              key={card.label}
              className={`absolute left-1/2 w-72 ${card.top} rounded-xl border border-line bg-bg-alt p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] animate-file-in sm:w-80`}
              style={{ animationDelay: card.delay, "--rot": card.rot } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                  {card.label}
                </span>
                <span className="h-2 w-2 rounded-full bg-good" />
              </div>
              <p className="mt-3 font-display text-2xl text-fg">{card.amount}</p>
              <p className="mt-1 font-mono text-[11px] text-muted">Paid · filed</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flow — a real sequence, so numbering earns its place */}
      <section className="relative z-10 border-t border-line bg-bg-alt/60 py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <h2 className="font-display text-3xl italic text-fg">
            How a payment becomes a ledger
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step) => (
              <div key={step.n} className="border-t border-line pt-5">
                <span className="font-mono text-sm text-accent">{step.n}</span>
                <h3 className="mt-3 font-display text-xl text-fg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <h2 className="max-w-lg font-display text-3xl italic text-fg">
            Built for how Kenyan rentals actually run.
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-line bg-bg-alt p-7 transition hover:border-accent/50"
              >
                <h3 className="font-display text-xl text-fg">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative z-10 border-t border-line py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 sm:px-8 md:flex-row md:items-end">
          <div>
            <h2 className="max-w-md font-display text-3xl italic text-fg">
              Stop reconstructing the month from memory.
            </h2>
            <p className="mt-3 max-w-sm text-muted">
              Set up your first property in a few minutes — the ledger fills
              itself in from there.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup?role=landlord"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-bg transition hover:brightness-110"
            >
              Start as a landlord
            </Link>
            <Link
              href="/signup?role=tenant"
              className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent"
            >
              Start as a tenant
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-display italic text-fg">RentFile</span>
          <span>© {new Date().getFullYear()} RentFile. Nairobi, Kenya.</span>
        </div>
      </footer>
    </main>
  );
}
