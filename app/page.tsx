"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    setMsg(error ? error.message : "Conta criada! Agora faça login.");
  }

  async function signIn() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    setMsg(error ? error.message : "Login realizado com sucesso!");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-center">Metas Lojas</h1>

        <div className="space-y-2">
          <label>Email</label>
          <input
            className="w-full border rounded-lg p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <label>Senha</label>
          <input
            type="password"
            className="w-full border rounded-lg p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={signIn}
            disabled={loading}
            className="flex-1 bg-black text-white rounded-lg p-2"
          >
            Entrar
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="flex-1 border rounded-lg p-2"
          >
            Cadastrar
          </button>
        </div>

        {msg && <p className="text-sm text-center">{msg}</p>}
      </div>
    </main>
  );
}
