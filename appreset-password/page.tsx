"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

function ResetForm() {
  const params = useSearchParams();
  const role = params.get("role") === "tenant" ? "tenant" : "landlord";

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? "Couldn't find an account with that email."
          : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg-alt px-3 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link
          href={`/login?role=${role}`}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-bg px-4 py-2 text-sm font-medium text-muted transition hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Reset password
          </span>

          {sent ? (
            <>
              <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-good-soft">
                <CheckCircle2 className="h-6 w-6 text-good" strokeWidth={1.75} />
              </div>
              <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                Check your email
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                If an account exists for <span className="font-medium text-fg">{email}</span>,
                a reset link is on its way. It can take a minute or two to
                arrive — check spam if you don't see it.
              </p>
              <Link
                href={`/login?role=${role}`}
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                Forgot your password?
              </h1>
              <p className="mt-2 text-sm text-muted">
                Enter the email on your account and we'll send you a link to
                set a new one.
              </p>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-fg">
                  Email
                </label>
                <div className="relative flex items-center">
                  <Mail
                    className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted"
                    strokeWidth={1.75}
                  />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-2xl border border-line bg-bg py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft"
                  />
                </div>
              </div>

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
                Send reset link
              </button>

              <p className="mt-5 text-center text-sm text-muted">
                Remembered it after all?{" "}
                <Link
                  href={`/login?role=${role}`}
                  className="font-semibold text-accent-ink hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
