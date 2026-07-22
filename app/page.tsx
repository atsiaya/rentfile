import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bell,
  Droplets,
  FileCheck2,
  Home,
  Menu,
  MessageCircle,
  Receipt,
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

const included = [
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

const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-alt pb-24 text-fg md:pb-0">
      <input type="checkbox" id="nav-toggle" className="peer hidden" />

      {/* Floating nav card */}
      <div className="sticky top-3 z-30 mx-3 sm:mx-6">
        <header className="mx-auto max-w-6xl rounded-2xl border border-line bg-bg/95 px-5 py-3.5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="leading-tight">
              <span className="font-display text-lg font-bold tracking-tight text-fg">
                RentFile
              </span>
              <p className="hidden text-[11px] text-muted sm:block">
                Rent &amp; bill records
              </p>
            </div>

            <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="transition hover:text-fg">
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/login?role=tenant"
                className="hidden rounded-full border border-line px-4 py-2 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent-ink sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup?role=landlord"
                className="hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 md:inline-flex"
              >
                Get started
              </Link>
              <label
                htmlFor="nav-toggle"
                aria-label="Toggle menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-fg md:hidden"
              >
                <Menu className="h-5 w-5" />
              </label>
            </div>
          </div>

          {/* Mobile panel */}
          <div className="hidden flex-col gap-1 border-t border-line pt-3 peer-checked:mt-3 peer-checked:flex md:hidden">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-bg-alt"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login?role=tenant"
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-bg-alt"
            >
              Sign in
            </Link>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-6xl space-y-4 px-3 pt-4 sm:px-6">
        {/* Hero card */}
        <section className="grid gap-10 rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10 md:grid-cols-2 md:items-center md:p-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Built for Kenyan landlords &amp; tenants
            </span>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-fg sm:text-5xl">
              Rent and bills,
              <br />
              filed properly.
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
              RentFile is the shared ledger for landlords and tenants — rent,
              water, and service charge, tracked and receipted in one place.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/signup?role=landlord"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Start as a landlord
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup?role=tenant"
                className="inline-flex items-center justify-center rounded-xl border border-line px-6 py-3.5 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent-ink"
              >
                Start as a tenant
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-soft px-6 py-3.5 text-sm font-semibold text-accent-ink transition hover:brightness-95"
              >
                <MessageCircle className="h-4 w-4" />
                See how it works
              </a>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6">
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

          {/* Ledger mockup */}
          <div className="rounded-2xl border border-line bg-bg-alt p-2">
            <div className="rounded-xl border border-line bg-bg">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <p className="text-xs font-medium text-muted">Kilimani Court</p>
                  <p className="font-display text-sm font-semibold text-fg">
                    July ledger
                  </p>
                </div>
                <span className="rounded-full bg-good-soft px-2.5 py-1 text-xs font-medium text-good">
                  2 of 3 paid
                </span>
              </div>
              <div className="divide-y divide-line">
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
                            ? "bg-good-soft text-good"
                            : "bg-accent-soft text-accent-ink"
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
                <span className="font-mono text-sm font-semibold text-accent-ink">
                  KES 30,000
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* How it works card */}
        <section
          id="how-it-works"
          className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10"
        >
          <h2 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            How a payment becomes a record
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((step) => (
              <div
                key={step.n}
                className="rounded-2xl border border-line bg-bg-alt p-5"
              >
                <span className="font-mono text-xs font-medium text-accent-ink">
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
        </section>

        {/* Included — vertical list with accent rail, matching the reference layout */}
        <section
          id="features"
          className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Included
          </span>
          <h2 className="mt-4 max-w-lg font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Everything a rental needs on record.
          </h2>

          <div className="mt-8 divide-y divide-line border-t border-line">
            {included.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 border-l-2 border-accent py-5 pl-5"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
                  <f.icon className="h-[18px] w-[18px] text-accent-ink" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-fg">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA card */}
        <section className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="max-w-md font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Stop reconstructing the month from memory.
              </h2>
              <p className="mt-3 max-w-sm text-muted">
                Set up your first property in a few minutes — the ledger
                fills itself in from there.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/signup?role=landlord"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Start as a landlord
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup?role=tenant"
                className="inline-flex items-center justify-center rounded-xl border border-line px-6 py-3.5 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent-ink"
              >
                Start as a tenant
              </Link>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 px-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display font-semibold text-fg">RentFile</span>
          <span>© {new Date().getFullYear()} RentFile. Nairobi, Kenya.</span>
        </footer>
      </div>

      {/* Fixed bottom tab bar — mobile only */}
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-line bg-bg/95 px-2 py-2 shadow-lg backdrop-blur md:hidden">
        <div className="flex items-center justify-around">
          <a
            href="#"
            className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-accent-ink"
          >
            <Home className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Home</span>
          </a>
          <a
            href="#how-it-works"
            className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-muted"
          >
            <Receipt className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Ledger</span>
          </a>
          <a
            href="#features"
            className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-muted"
          >
            <Users className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Tenants</span>
          </a>
        </div>
      </nav>
    </main>
  );
}