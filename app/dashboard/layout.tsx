"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  LogOut,
  Menu,
  Plus,
  ShieldAlert,
  X,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { accessKeysFor, useUserRecord } from "@/lib/useUserRecord";
import { allNavItems, keyForPath, navSections } from "@/lib/dashboardNav";
import { PropertyProvider, useProperty } from "@/lib/propertyContext";

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useUserRecord();
  const { properties, selected, selectedId, setSelectedId, error: propertyError } = useProperty();

  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close the mobile drawer on every navigation.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const PropertyPicker = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPropertyMenuOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line px-3.5 py-3 text-sm font-medium text-fg transition hover:border-accent/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          <span className="truncate">
            {selected ? selected.name : properties.length ? "Select property" : "No properties yet"}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {propertyMenuOpen && (
        <>
          <button
            aria-label="Close"
            onClick={() => setPropertyMenuOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-line bg-bg p-1.5 shadow-lg">
            {properties.length === 0 && (
              <p className="px-3 py-2.5 text-sm text-muted">
                {propertyError ? `Couldn't load properties: ${propertyError}` : "No properties yet."}
              </p>
            )}
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedId(p.id);
                  setPropertyMenuOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-fg transition hover:bg-bg-alt"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{p.area}</span>
                </span>
                {p.id === selectedId && (
                  <Check className="h-4 w-4 shrink-0 text-accent-ink" strokeWidth={2} />
                )}
              </button>
            ))}
            {canManageProperties && (
              <Link
                href="/dashboard/collect"
                onClick={() => setPropertyMenuOpen(false)}
                className="mt-1 flex items-center gap-2 rounded-xl border-t border-line px-3 py-2.5 text-sm font-medium text-accent-ink transition hover:bg-accent-soft"
              >
                <Plus className="h-4 w-4" />
                Add property
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );

  const ProfileMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setProfileMenuOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink"
      >
        {profile.fullName.charAt(0).toUpperCase()}
      </button>

      {profileMenuOpen && (
        <>
          <button
            aria-label="Close"
            onClick={() => setProfileMenuOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-bg p-1.5 shadow-lg">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-fg">
                {profile.fullName}
              </p>
              <p className="truncate text-xs text-muted">{profile.email}</p>
              <span className="mt-1.5 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium capitalize text-accent-ink">
                {profile.role}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl border-t border-line px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-bg-alt hover:text-fg"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );

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

          <div className="mt-4">{PropertyPicker}</div>

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
          {/* Top bar — one instance, shared by mobile and desktop */}
          <div className="flex items-center justify-between rounded-3xl border border-line bg-bg px-4 py-3.5 shadow-sm sm:px-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg lg:hidden"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
              <span className="font-display text-base font-bold text-fg lg:hidden">
                RentFile
              </span>
              <span className="hidden text-sm text-muted lg:block">
                {new Date().toLocaleDateString("en-KE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {canManageProperties && (
                <Link
                  href="/dashboard/properties/new"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-105 sm:px-4"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Property</span>
                </Link>
              )}
              {ProfileMenu}
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

      {/* Mobile bottom tab bar — Home + Menu opens the full drawer below */}
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-line bg-bg/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden">
        <div className="flex items-center justify-around">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center gap-1 rounded-xl px-5 py-1.5 ${
              pathname === "/dashboard" ? "text-accent-ink" : "text-muted"
            }`}
          >
            <Building2 className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Home</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 rounded-xl px-5 py-1.5 text-muted"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile menu drawer — every section a landlord/agent can reach */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="absolute inset-x-3 bottom-3 top-16 flex flex-col rounded-3xl border border-line bg-bg p-4 shadow-xl">
            <div className="flex items-center justify-between px-2 pb-3">
              <span className="font-display text-lg font-bold text-fg">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="px-1 pb-3">{PropertyPicker}</div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-1">
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
                          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
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
              className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted transition hover:bg-bg-alt hover:text-fg"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PropertyProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </PropertyProvider>
  );
}
