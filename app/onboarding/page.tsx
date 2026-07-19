"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  KeyRound,
  Loader2,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Role } from "@/lib/useUserRecord";

const businessTypes = [
  { value: "individual", label: "Individual landlord" },
  { value: "manager", label: "Property manager" },
  { value: "agency", label: "Agency workspace" },
] as const;

function pathForRole(role: Role) {
  return role === "tenant" ? "/units" : "/dashboard";
}

function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const role = (["landlord", "tenant", "agent"] as const).includes(
    params.get("role") as Role
  )
    ? (params.get("role") as Role)
    : "landlord";

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const [agencyOrContact, setAgencyOrContact] = useState("");
  const [businessType, setBusinessType] = useState<string>("individual");
  const [inviteCode, setInviteCode] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Google gets you signed in — this page just makes sure a users/{uid} record exists before continuing.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace(`/signup?role=${role}`);
        return;
      }
      const existing = await getDoc(doc(db, "users", u.uid));
      if (existing.exists()) {
        router.replace(pathForRole(existing.data().role as Role));
        return;
      }
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, [router, role]);

  function privilegeFields() {
    if (role === "landlord") return { agencyOrContact, businessType };
    if (role === "agent") return { accessRights: [] as string[] };
    return { inviteCode };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        fullName: user.displayName ?? "",
        email: user.email ?? "",
        whatsapp,
        country: "Kenya",
        role,
        ...privilegeFields(),
        provider: "google",
        createdAt: serverTimestamp(),
      });
      router.push(pathForRole(role));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save that. Try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-alt">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bg-alt px-3 py-10 sm:px-6">
      <div className="mx-auto max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Almost there
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            A few more details
          </h1>
          <p className="mt-2 text-sm text-muted">
            Google gave us your name and email — just fill in the rest.
          </p>

          {/* Pulled from Google, shown read-only */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-bg-alt p-4">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink">
                {(user.displayName ?? user.email ?? "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-fg">
                {user.displayName}
              </p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
          </div>

          {role === "landlord" && (
            <>
              <Field label="Agency or Contact">
                <InputIcon icon={Building2} />
                <input
                  value={agencyOrContact}
                  onChange={(e) => setAgencyOrContact(e.target.value)}
                  placeholder="Agency or Contact"
                  className={inputClass}
                />
              </Field>

              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-fg">
                  Business type
                </p>
                <div className="space-y-2.5">
                  {businessTypes.map((bt) => {
                    const selected = businessType === bt.value;
                    return (
                      <label
                        key={bt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
                          selected
                            ? "border-accent bg-accent-soft"
                            : "border-line bg-bg hover:border-accent/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="businessType"
                          value={bt.value}
                          checked={selected}
                          onChange={() => setBusinessType(bt.value)}
                          className="h-4 w-4 accent-accent"
                        />
                        <span className="text-sm font-semibold text-fg">
                          {bt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {role === "tenant" && (
            <Field label="Property invite code">
              <InputIcon icon={KeyRound} />
              <input
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Code from your landlord"
                className={inputClass}
              />
            </Field>
          )}

          {role === "agent" && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-bg-alt p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
              <p className="text-sm text-muted">
                You'll land on the dashboard with no sections visible until
                the landlord grants you access.
              </p>
            </div>
          )}

          <Field label="WhatsApp Number">
            <InputIcon icon={Phone} />
            <input
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="0722 123 456 or +254722123456"
              className={inputClass}
            />
          </Field>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Finish setting up
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <label className="mb-2 block text-sm font-semibold text-fg">
        {label}
      </label>
      <div className="relative flex items-center">{children}</div>
    </div>
  );
}

function InputIcon({ icon: Icon }: { icon: typeof Phone }) {
  return (
    <Icon className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
  );
}

const inputClass =
  "w-full rounded-2xl border border-line bg-bg py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingForm />
    </Suspense>
  );
}
