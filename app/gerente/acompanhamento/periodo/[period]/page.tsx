"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type LinhaLoja = {
  store_id: number;
  store_name: string;
  meta: number;
  vendido: number;
};

export default function AcompanhamentoPeriodoPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const period = params.period as "manha" | "noite";
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<LinhaLoja[]>([]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, month, year]);

  async function carregar() {
    setLoading(true);

    // 🔐 valida gerente
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return (window.location.href = "/");

    const { data: perfil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!perfil || !perfil.role.startsWith("gerente")) {
      window.location.href = "/";
      return;
    }

    // 🏬 lojas
    const { data: lojas } = await supabase
      .from("stores")
      .select("id, name")
      .order("id");

    // 🎯 metas do período
    const { data: metas } = await supabase
      .from("store_period_goals")
      .select("*")
      .eq("period", period)
      .eq("month", month)
      .eq("year", year);

    // 💰 vendas do período
    const inicio = `${year}-${String(month).padStart(2, "0")}-01`;
    const fim = `${year}-${String(month).padStart(2, "0")}-31`;

    const { data: vendas } = await supabase
      .from("sales")
      .select("store_id, amount")
      .eq("period", period)
      .gte("sale_date", inicio)
      .lte("sale_date", fim);

    const linhas: LinhaLoja[] = [];

    for (const loja of lojas || []) {
      const meta =
        metas?.find(
          (m) => m.store_id === loja.id
        )?.goal_value || 0;

      const vendido =
        vendas
          ?.filter((v) => v.store_id === loja.id)
          .reduce((s, v) => s + Number(v.amount), 0) || 0;

      linhas.push({
        store_id: loja.id,
        store_name: loja.name,
        meta,
        vendido,
      });
    }

    setDados(linhas);
    setLoading(false);
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold capitalize">
        Acompanhamento — {period}
      </h1>

      <p className="text-sm text-gray-600">
        {month}/{year}
      </p>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Loja</th>
            <th className="border p-2 text-right">Meta</th>
            <th className="border p-2 text-right">Vendido</th>
            <th className="border p-2 text-right">% Atingido</th>
          </tr>
        </thead>

        <tbody>
          {dados.map((d, i) => {
            const pct =
              d.meta > 0 ? (d.vendido / d.meta) * 100 : 0;

            return (
              <tr key={i}>
                <td className="border p-2 font-medium">
                  {d.store_name}
                </td>

                <td className="border p-2 text-right">
                  R$ {d.meta.toLocaleString("pt-BR")}
                </td>

                <td className="border p-2 text-right">
                  R$ {d.vendido.toLocaleString("pt-BR")}
                </td>

                <td
                  className={`border p-2 text-right font-medium ${
                    pct >= 100
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {pct.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
