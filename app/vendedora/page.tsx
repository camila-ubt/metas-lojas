"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function VendedoraPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // 🔒 Proteção da rota (somente vendedora)
  useEffect(() => {
    async function protect() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        window.location.href = "/";
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role, nome")
        .eq("id", data.session.user.id)
        .single();

      if (error || !prof) {
        await supabase.auth.signOut();
        window.location.href = "/";
        return;
      }

      // ❌ gerente não entra aqui
      if (prof.role !== "vendedora") {
        window.location.href = "/gerente";
        return;
      }

      setLoading(false);
    }

    protect();
  }, []);

  if (loading) return <div className="p-6">Carregando…</div>;

  // ✅ DASHBOARD DA VENDEDORA
  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard da Vendedora</h1>

        <button
          className="border rounded-lg px-3 py-2 text-sm"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          Sair
        </button>
      </header>

      <section className="border rounded-2xl p-4 space-y-2">
        <h2 className="font-semibold">Lançamento de Vendas</h2>
        <p className="text-sm opacity-70">
          Aqui você irá lançar suas vendas por dia e período.
        </p>

        {/* 🔽 AQUI ENTRA O FORMULÁRIO DE VENDAS (próximo passo) */}
        <div className="mt-4 text-sm italic opacity-60">
          (Formulário de vendas será adicionado aqui)
        </div>
      </section>
    </main>
  );
}
