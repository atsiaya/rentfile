
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") === "tenant" ? "tenant" : "landlord";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const storedRole = snap.exists() ? snap.data().role : role;
      router.push(storedRole === "landlord" ? "/dashboard" : "/tenant");
    } catch (err) {
      setError(
        err instanceof Error
          ? "Couldn't sign you in — check your email and password."
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
            {role === "landlord" ? "Landlord sign in" : "Tenant sign in"}
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to see your ledger, up to date.
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

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-fg">
                Password
              </label>
              <Link
                href="/reset-password"
                className="text-xs font-medium text-accent-ink hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock
                className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-muted"
                strokeWidth={1.75}
              />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
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
            Sign in
          </button>

          <p className="mt-5 text-center text-sm text-muted">
            New here?{" "}
            <Link
              href={`/signup?role=${role}`}
              className="font-semibold text-accent-ink hover:underline"
            >
              Create an account
            </Link>
          </p>
        </form>

        <div className="mt-4 flex justify-center gap-2 text-xs text-muted">
          <Link
            href={`/login?role=${role === "landlord" ? "tenant" : "landlord"}`}
            className="rounded-full border border-line bg-bg px-3.5 py-1.5 font-medium transition hover:text-fg"
          >
            {role === "landlord" ? "Sign in as tenant instead" : "Sign in as landlord instead"}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

