"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Role } from "@/lib/useUserRecord";

function pathForRole(role: Role) {
  return role === "tenant" ? "/units" : "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") === "tenant" ? "tenant" : "landlord";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const storedRole = snap.exists() ? (snap.data().role as Role) : role;
      router.push(pathForRole(storedRole));
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

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const snap = await getDoc(doc(db, "users", cred.user.uid));

      if (snap.exists()) {
        router.push(pathForRole(snap.data().role as Role));
        return;
      }

      // First time this Google account has signed in anywhere — no privilege
      // record yet, so finish setup the same way a fresh Google signup would.
      router.push(`/onboarding?role=${role}`);
    } catch (err) {
      setError(
        err instanceof Error ? "Google sign-in didn't go through. Try again." : "Something went wrong. Try again."
      );
    } finally {
      setGoogleLoading(false);
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

        <div className="rounded-3xl border border-line bg-bg p-6 shadow-sm sm:p-10">
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

          <button
            type="button"
            onClick={handleGoogleLogin}
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
            <div>
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
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            New here?{" "}
            <Link
              href={`/signup?role=${role}`}
              className="font-semibold text-accent-ink hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>

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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
