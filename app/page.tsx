import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bell,
  Droplets,
  FileCheck2,
  Users,
  Wrench,
} from "lucide-react";

const stats = [
  { value: "98%", label: "Rent collected on time" },
  { value: "12k+", label: "Bills filed monthly" },
  { value: "3 min", label: "To onboard a property" },
];

const flow = [
  {
    n: "01",
    title: "Tenant pays",
    body: "M-Pesa, bank, or card — straight from the tenant's phone, no receipts forwarded on WhatsApp.",
  },
  {
    n: "02",
    title: "RentFile reconciles",
    body: "Every payment is matched to the right unit and bill automatically, the moment it lands.",
  },
  {
    n: "03",
    title: "Landlord sees it live",
    body: "The ledger updates in real time — who's paid, who's late, per property.",
  },
  {
    n: "04",
    title: "A receipt is filed",
    body: "Both sides get a dated, searchable record that doesn't depend on memory.",
  },
];

const features = [
  {
    icon: Banknote,
    title: "One ledger, both sides",
    body: "Landlords and tenants look at the same numbers — no separate spreadsheets that quietly disagree.",
  },
  {
    icon: Droplets,
    title: "Bills beyond rent",
    body: "Water, garbage, service charge, and one-off levies, each tracked on its own line.",
  },
  {
    icon: Bell,
    title: "Reminders that land",
    body: "SMS and push nudges before rent is due, not apologetic messages after it's late.",
  },
  {
    icon: Wrench,
    title: "Maintenance, logged",
    body: "A tenant reports it, a landlord sees it, the record doesn't disappear into a phone call.",
  },
  {
    icon: Users,
    title: "Every tenant, one place",
    body: "Lease terms, contacts, and payment history per unit — searchable in seconds.",
  },
  {
    icon: FileCheck2,
    title: "Documents, filed",
    body: "Leases, notices, and receipts attached to the right tenant, not buried in email.",
  },
];

const ledgerRows = [
  { unit: "A1", tenant: "N. Wanjiru", amount: "KES 28,000", status: "Paid" },
  { unit: "A2", tenant: "J. Otieno", amount: "KES 25,000", status: "Paid" },
  { unit: "B3", tenant: "M. Njoroge", amount: "KES 30,000", status: "Due" },
];

export default function LandingPage() {
  return (
    <main className="bg-bg text-fg">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
          <span className="font-display text-lg font-bold tracking-tight text-fg">
            RentFile
          </span>
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#how-it-works" className="transition hover:text-fg">
              How it works
            </a>
            <a href="#features" className="transition hover:text-fg">
              Features
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login?role=tenant"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-fg"
            >
              Sign in
            </Link>
            <Link
              href="/signup?role=landlord"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:brightness-110"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 sm:px-8 md:grid-cols-2 md:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-alt px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            Built for Kenyan landlords &amp; tenants
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl">
            Rent and bills,
            <br />
            filed properly.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            RentFile is the shared ledger for landlords and tenants — rent,
            water, and service charge, tracked and receipted in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup?role=landlord"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-bg transition hover:brightness-110"
            >
              I'm a landlord
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup?role=tenant"
              className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent"
            >
              I'm a tenant
            </Link>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-bold text-fg">
                  {s.value}
                </dt>
                <dd className="mt-1 text-xs leading-snug text-muted">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Product mockup — a real ledger, not decoration */}
        <div className="animate-fade-up rounded-2xl border border-line bg-bg-alt p-2 shadow-2xl shadow-black/30">
          <div className="rounded-xl border border-line bg-bg-raised">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-medium text-muted">Kilimani Court</p>
                <p className="font-display text-sm font-semibold text-fg">
                  July ledger
                </p>
              </div>
              <span className="rounded-full bg-good/15 px-2.5 py-1 text-xs font-medium text-good">
                2 of 3 paid
              </span>
            </div>
            <div className="divide-y divide-line/70">
              {ledgerRows.map((row) => (
                <div
                  key={row.unit}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-alt font-mono text-xs text-muted">
                      {row.unit}
                    </span>
                    <span className="text-sm text-fg">{row.tenant}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-fg">
                      {row.amount}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        row.status === "Paid"
                          ? "bg-good/15 text-good"
                          : "bg-accent/15 text-accent"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-xs text-muted">Total outstanding</span>
              <span className="font-mono text-sm font-semibold text-accent">
                KES 30,000
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-line bg-bg-alt/50 py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            How a payment becomes a record
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step) => (
              <div
                key={step.n}
                className="rounded-xl border border-line bg-bg p-6"
              >
                <span className="font-mono text-xs text-accent">
                  {step.n}
                </span>
                <h3 className="mt-3 font-display text-base font-semibold text-fg">
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
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <h2 className="max-w-lg font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Everything a rental needs on record.
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-line bg-bg-alt p-6 transition hover:border-accent/50"
              >
                <f.icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                <h3 className="mt-4 font-display text-base font-semibold text-fg">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-line py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 sm:px-8 md:flex-row md:items-center">
          <div>
            <h2 className="max-w-md font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Stop reconstructing the month from memory.
            </h2>
            <p className="mt-3 max-w-sm text-muted">
              Set up your first property in a few minutes — the ledger fills
              itself in from there.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup?role=landlord"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-bg transition hover:brightness-110"
            >
              Start as a landlord
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup?role=tenant"
              className="rounded-lg border border-line px-5 py-3 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent"
            >
              Start as a tenant
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-display font-semibold text-fg">RentFile</span>
          <span>© {new Date().getFullYear()} RentFile. Nairobi, Kenya.</span>
        </div>
      </footer>
    </main>
  );
}
