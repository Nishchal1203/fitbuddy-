"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logo from "../../assets/Logo_full.svg";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const form = new FormData(event.currentTarget);
      const payload = Object.fromEntries(form.entries()) as Record<
        string,
        string
      >;

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          full_name: payload.name,
          password: payload.password,
          experience_level: "Beginner",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Registration failed");
      }

      const userData = await response.json();
      setSuccess(
        `Registration successful! Welcome ${userData.full_name}. Redirecting...`,
      );
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-brand-pale bg-white px-3.5 py-2.5 text-sm text-brand-slate outline-none transition placeholder:text-brand-slate/40 focus:border-brand-soft focus:ring-2 focus:ring-brand-soft/20";

  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-slate";

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-brand-bg px-4 py-8">
      <div className="w-full max-w-[23rem] rounded-2xl border border-brand-pale bg-white px-6 py-7 shadow-[0_20px_50px_-22px_#9567B9]">
        <div className="mb-5 flex items-center gap-3">
          <Image
            src={logo}
            alt="Fit Buddy logo"
            width={36}
            height={36}
            className="rounded-xl"
          />
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-deep">
              FITBUDDY
            </p>
            <h1 className="text-xl font-bold text-brand-slate">
              Create Account
            </h1>
          </div>
        </div>

        <p className="mb-5 text-sm text-brand-slate/70">
          Set up your account and get started.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-brand-goldLight bg-brand-goldLight/30 px-3 py-2 text-sm text-brand-slate">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-brand-gold bg-brand-gold/20 px-3 py-2 text-sm font-medium text-brand-deep">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-3.5"
          data-lpignore="true"
        >
          <div>
            <label htmlFor="name" className={labelCls}>
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Your name"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelCls}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`mt-1 w-full rounded-xl py-3 text-sm font-semibold text-white transition ${
              loading
                ? "cursor-not-allowed bg-brand-mauve"
                : "bg-gradient-to-r from-brand-purple to-brand-deep hover:opacity-95"
            }`}
          >
            {loading ? "Processing..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-brand-slate/70">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-gold hover:text-brand-deep"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
