"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/reset-password` }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Send className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Revisa tu email</h2>
        <p className="text-sm text-gray-300">
          Enviamos un enlace de recuperacion a <span className="text-white font-medium">{email}</span>
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a iniciar sesion
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Recuperar acceso</h2>
        <p className="mt-2 text-sm text-gray-300">
          Ingresa tu email y te enviaremos un enlace
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-8">
        <div className="relative z-0">
          <input
            type="email"
            id="floating_reset_email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
            placeholder=" "
            required
          />
          <label
            htmlFor="floating_reset_email"
            className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            <Mail className="inline-block mr-2 -mt-1" size={16} />
            Email
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar enlace"}
          {!loading && (
            <Send className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          )}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400">
        <Link
          href="/auth/login"
          className="inline-flex items-center font-semibold text-blue-400 hover:text-blue-300 transition"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Volver a iniciar sesion
        </Link>
      </p>
    </div>
  );
}
