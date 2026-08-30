"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function signUp() {
    setLoading(true);
    setMessage("");

    const { error } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account created. Check your email if confirmation is required."
    );

    setLoading(false);
  }

  async function signIn() {
    setLoading(true);
    setMessage("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">
          🌱 The Plant Diary
        </h1>

        <p className="mt-2 text-gray-500">
          Sign in to manage your plants.
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-green-600"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-green-600"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p className="text-sm text-gray-600">
              {message}
            </p>
          )}

          <button
            onClick={signIn}
            disabled={loading}
            className="w-full rounded-xl bg-green-700 p-3 font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : "Sign in"}
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="w-full rounded-xl border border-green-700 p-3 font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
          >
            Create account
          </button>
        </div>
      </div>
    </main>
  );
}