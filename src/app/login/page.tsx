"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(email, password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-white">
      <div className="hidden md:flex md:w-[42%] bg-black text-white flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <svg width="26" height="30" viewBox="0 0 34 40" aria-hidden>
            <path d="M2 2 H32 V11 H21.5 V38 H12.5 V11 H2 Z" fill="#D6001C" />
          </svg>
          <div>
            <div className="text-[15px] font-semibold tracking-wide">TECH DIRECT SUPPORT</div>
            <div className="text-[10px] tracking-[0.22em] text-white/50 mt-0.5">
              RELIABLE. RESPONSIVE. RESOLVED.
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-[28px] font-semibold leading-tight max-w-sm">
            TDS Asset Intelligence Platform
          </h1>
          <p className="text-[13px] text-white/60 mt-3 max-w-sm leading-relaxed">
            One place to register, locate, and govern every physical and technology asset your
            business owns — with geofenced visibility, lifecycle control, and AI-assisted
            operations.
          </p>
        </div>
        <div className="text-[11px] text-white/40">
          © {new Date().getFullYear()} Tech Direct Support
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-[340px]">
          <h2 className="text-[19px] font-semibold text-ink mb-1">Sign in</h2>
          <p className="text-[13px] text-ink-soft mb-6">Access your asset intelligence workspace.</p>

          {error && (
            <div className="mb-4 text-[12px] px-3 py-2 border border-red bg-red-tint text-red-dark rounded-[3px]">
              {error}
            </div>
          )}

          <label className="block text-[12px] font-medium text-ink mb-1.5" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-9 px-3 mb-4 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black"
            placeholder="you@company.com"
          />

          <label className="block text-[12px] font-medium text-ink mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-9 px-3 mb-6 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-red text-white text-[13px] font-medium rounded-[3px] hover:bg-red-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
