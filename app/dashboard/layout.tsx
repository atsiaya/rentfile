"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Building2,
  ChevronDown,
  Loader2,
  LogOut,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { accessKeysFor, useUserRecord } from "@/lib/useUserRecord";
import { allNavItems, keyForPath, navSections } from "@/lib/dashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useUserRecord();

  const isChecking = loading || !user || !profile || profile.role === "tenant";

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace("/login?role=landlord");
      return;
    }
    if (profile.role === "tenant") {
      router.replace("/units");
    }
  }, [loading, user, profile, router]);

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/");
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-alt">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const allowedKeys = accessKeysFor(profile);
  const canManageProperties = profile.role === "landlord";
  const currentKey = keyForPath(pathname);
  const isBlocked = profile.role === "agent" && currentKey && !allowedKeys.includes(currentKey);

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowedKeys.includes(item.key)),
    }))
    .filter((section) => section.items.length > 0);

  const HomeIcon = allNavItems.find((i) => i.key === "home")!.icon;
  const LedgerIcon = allNavItems.find((i) => i.key === "ledger")!.icon;
  const TenantsIcon = allNavItems.find((i) => i.key === "tenants")!.icon;

  return (
    <div className="min-h-screen bg-bg-alt pb-24 lg:pb-0">
      <div className="mx-auto flex max-w-7xl gap-4 p-3 sm:p-4 lg:p-6">
        {/* Sidebar — desktop only */}
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-3xl border border-line bg-bg p-4 shadow-sm lg:flex">
          <div className="flex items-center gap-2 px-2 py-2">
            <span className="font-display text-lg font-bold tracking-tight text-fg">
              RentFile
            </span>
          </div>

          <button
            type="button"
            className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-line px-3.5 py-3 text-sm font-medium text-fg transition hover:border-accent/50"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted" strokeWidth={1.75} />
              Select property
            </span>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>

          <nav className="mt-4 flex-1 space-y-5 overflow-y-auto">
            {visibleSections.map((section, i) => (
              <div key={i}>
                {section.heading && (
                  <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {section.heading}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-accent-soft text-accent-ink"
                            : "text-fg hover:bg-bg-alt"
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <button
            onClick={handleSignOut}
            className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-bg-alt hover:text-fg"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Sign out
          </button>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between rounded-3xl border border-line bg-bg px-5 py-3.5 shadow-sm">
            <span className="font-display text-base font-bold text-fg lg:hidden">
              RentFile
            </span>
            <div className="hidden text-sm text-muted lg:block">
              {new Date().toLocaleDateString("en-KE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
            <div className="flex items-center gap-2">
              {canManageProperties && (
                <Link
                  href="/dashboard/properties/new"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Property</span>
                </Link>
              )}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Limited access notice for agents */}
          {profile.role === "agent" && !isBlocked && (
            <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" strokeWidth={1.75} />
              <p className="text-sm text-accent-ink">
                You're signed in as an agent with limited access
                {allowedKeys.length > 0 ? " to: " : "."}
                {allowedKeys
                  .filter((k) => k !== "home")
                  .map((k) => allNavItems.find((i) => i.key === k)?.label)
                  .filter(Boolean)
                  .join(", ")}
                . Contact the landlord to change what you can see.
              </p>
            </div>
          )}

          {isBlocked ? (
            <div className="flex flex-col items-center rounded-3xl border border-line bg-bg p-10 text-center shadow-sm sm:p-14">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
                <ShieldAlert className="h-6 w-6 text-accent-ink" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold text-fg">
                You don't have access to this yet
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                The landlord hasn't granted you this section. Ask them to
                update your access.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-line px-6 py-3 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent-ink"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-line bg-bg/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden">
        <div className="flex items-center justify-around">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 ${
              pathname === "/dashboard" ? "text-accent-ink" : "text-muted"
            }`}
          >
            <HomeIcon className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Home</span>
          </Link>
          {allowedKeys.includes("ledger") && (
            <Link
              href="/dashboard/ledger"
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 ${
                pathname.startsWith("/dashboard/ledger") ? "text-accent-ink" : "text-muted"
              }`}
            >
              <LedgerIcon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-[11px] font-medium">Ledger</span>
            </Link>
          )}
          {allowedKeys.includes("tenants") && (
            <Link
              href="/dashboard/tenants"
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 ${
                pathname.startsWith("/dashboard/tenants") ? "text-accent-ink" : "text-muted"
              }`}
            >
              <TenantsIcon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-[11px] font-medium">Tenants</span>
            </Link>
          )}
          <button onClick={handleSignOut} className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-muted">
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Sign out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
