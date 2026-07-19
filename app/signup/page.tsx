"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Role } from "@/lib/useUserRecord";

const businessTypes = [
  { value: "individual", label: "Individual landlord" },
  { value: "manager", label: "Property manager" },
  { value: "agency", label: "Agency workspace" },
] as const;

/** Where a signed-in user lands, based on their privilege record. */
function pathForRole(role: Role) {
  return role === "tenant" ? "/units" : "/dashboard";
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const role = (["landlord", "tenant", "agent"] as const).includes(
    params.get("role") as Role
  )
    ? (params.get("role") as Role)
    : "landlord";

  const [fullName, setFullName] = useState("");
  const [agencyOrContact, setAgencyOrContact] = useState("");
  const [businessType, setBusinessType] = useState<string>("individual");
  const [inviteCode, setInviteCode] = useState("");
  const [country] = useState("Kenya");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /** The privilege record written to users/{uid} — this is what every page reads to decide access. */
  function privilegeFields() {
    if (role === "landlord") return { agencyOrContact, businessType };
    if (role === "agent") return { accessRights: [] as string[] }; // granted later by a landlord
    return { inviteCode };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });

      await setDoc(doc(db, "users", cred.user.uid), {
        fullName,
        email,
        whatsapp,
        country,
        role,
        ...privilegeFields(),
        provider: "password",
        createdAt: serverTimestamp(),
      });

      // Account exists and is signed in — go straight to the page their role grants.
      router.push(pathForRole(role));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError(null);
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const existing = await getDoc(doc(db, "users", cred.user.uid));

      if (existing.exists()) {
        // Already onboarded from a previous sign-in — route by their stored role.
        router.push(pathForRole(existing.data().role as Role));
        return;
      }

      // New account: Google gave us name + email, but not role-specific details yet.
      router.push(`/onboarding?role=${role}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google sign-up didn't go through. Try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg-alt px-3 py-10 sm:px-6">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-bg px-4 py-2 text-sm font-medium text-muted transition hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {role === "landlord" && "Landlord account"}
            {role === "tenant" && "Tenant account"}
            {role === "agent" && "Agent account"}
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Create account
          </h1>
          <p className="mt-2 text-sm text-muted">
            {role === "landlord" &&
              "Set up your workspace and start filing rent and bills today."}
            {role === "tenant" &&
              "Join your landlord's ledger to pay rent and see your records."}
            {role === "agent" &&
              "Your access is granted by the landlord who invited you — sign up, then wait to be assigned."}
          </p>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-bg px-6 py-3.5 text-sm font-semibold text-fg transition hover:border-accent/50 disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleGlyph />
            )}
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium text-muted">or with email</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit}>
            <Field label="Full name">
              <InputIcon icon={User} />
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className={inputClass}
              />
            </Field>

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

            <Field label="Country">
              <InputIcon icon={Globe} />
              <input
                disabled
                value={country}
                className={`${inputClass} cursor-not-allowed text-fg`}
              />
            </Field>

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

            <Field label="Email">
              <InputIcon icon={Mail} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={inputClass}
              />
            </Field>

            <Field label="Password">
              <InputIcon icon={Lock} />
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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
              disabled={loading}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {role === "landlord" && "Create landlord account"}
              {role === "tenant" && "Create tenant account"}
              {role === "agent" && "Create agent account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href={`/login?role=${role}`}
              className="font-semibold text-accent-ink hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
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

function InputIcon({ icon: Icon }: { icon: typeof User }) {
  return (
    <Icon className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.2-17.1 10.3-.2.1-.4.3-.6.4z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.9 39.6 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.6C41.6 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-2xl border border-line bg-bg py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
