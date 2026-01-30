// app/gerente/acompanhamento/page.tsx

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AcompanhamentoPage() {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<any>(null);

  useEffect(() => {
    async function fetchResumo() {
      setLoading(true);

      // Exemplo básico: busca total vendido e total de metas do mês atual
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;

      if (!user) {
        window.location.href = "/";
        return;
      }

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString().slice(0, 10);

      const { data: vendas } = await supabase
        .from("sales")
        .select("amount")
        .gte("sale_date", inicioMes)
        .lt("sale_date", fimMes);

      const { data: metas } = await supabase
        .from("store_targets")
        .select("target_value")
        .eq("month", inicioMes);

      const totalVendas = vendas?.reduce((acc, v) => acc + Number(v.amount || 0), 0) || 0;
      const totalMetas = metas?.reduce((acc, m) => acc + Number(m.target_value || 0), 0) || 0;

      setResumo({
        vendas: totalVendas,
        metas: totalMetas,
        progresso: totalMetas > 0 ? (totalVendas / totalMetas) * 100 : 0,
      });

      setLoading(false);
    }

    fetchResumo();
  }, []);

  if (loading) return <p className="p-4">Carregando…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Acompanhamento de Metas</h1>

      <div className="border rounded-xl p-4 bg-gray-50">
        <p><strong>Total vendido no mês:</strong> R$ {resumo.vendas.toFixed(2)}</p>
        <p><strong>Meta total:</strong> R$ {resumo.metas.toFixed(2)}</p>
        <p><strong>Progresso:</strong> {resumo.progresso.toFixed(1)}%</p>
      </div>

      {/* Aqui futuramente entram os gráficos e projeções por loja ou vendedora */}
      <p className="text-sm text-gray-500">* Em breve: projeção de metas e gráficos de desempenho.</p>
    </div>
  );
}
