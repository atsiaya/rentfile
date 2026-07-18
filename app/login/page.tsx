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
  User,
} from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const businessTypes = [
  { value: "individual", label: "Individual landlord" },
  { value: "manager", label: "Property manager" },
  { value: "agency", label: "Agency workspace" },
] as const;

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") === "tenant" ? "tenant" : "landlord";

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
        ...(role === "landlord"
          ? { agencyOrContact, businessType }
          : { inviteCode }),
        createdAt: serverTimestamp(),
      });

      router.push(role === "landlord" ? "/dashboard" : "/tenant");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
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

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {role === "landlord" ? "Landlord account" : "Tenant account"}
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Create account
          </h1>
          <p className="mt-2 text-sm text-muted">
            {role === "landlord"
              ? "Set up your workspace and start filing rent and bills today."
              : "Join your landlord's ledger to pay rent and see your records."}
          </p>

          {/* Full name */}
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

          {role === "landlord" ? (
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
          ) : (
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
            {role === "landlord" ? "Create landlord account" : "Create tenant account"}
          </button>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href={`/login?role=${role}`}
              className="font-semibold text-accent-ink hover:underline"
            >
              Sign in
            </Link>
          </p>
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

function InputIcon({ icon: Icon }: { icon: typeof User }) {
  return (
    <Icon className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted" strokeWidth={1.75} />
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
