"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      setLoading(false);
      setMsg("Email ou senha inválidos.");
      return;
    }

    const userId = data.session.user.id;

    // 🔎 busca o perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      setMsg("Perfil não encontrado.");
      await supabase.auth.signOut();
      return;
    }

    // 🚦 regra FINAL
    if (profile.role === "gerente") {
      router.replace("/gerente");
    } else {
      router.replace("/vendedora");
    }
  }

  async function signUp() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);
    setMsg(error ? error.message : "Conta criada! Verifique seu email.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-center">Metas Lojas</h1>

        <input
          className="w-full border rounded-lg p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border rounded-lg p-2"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

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

        {msg && <p className="text-center text-sm text-red-500">{msg}</p>}
      </div>
    </main>
  );
}
