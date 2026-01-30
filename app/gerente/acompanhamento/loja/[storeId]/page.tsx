"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type LinhaPeriodo = {
  period: "manha" | "noite";
  meta: number;
  vendido: number;
};

export default function AcompanhamentoLojaPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const storeId = Number(params.storeId);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [dados, setDados] = useState<LinhaPeriodo[]>([]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, month, year]);

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

    // 🏬 nome da loja
    const { data: loja } = await supabase
      .from("stores")
      .select("name")
      .eq("id", storeId)
      .single();

    setStoreName(loja?.name || "");

    // 🎯 metas
    const { data: metas } = await supabase
      .from("store_period_goals")
      .select("*")
      .eq("store_id", storeId)
      .eq("month", month)
      .eq("year", year);

    // 💰 vendas
    const inicio = `${year}-${String(month).padStart(2, "0")}-01`;
    const fim = `${year}-${String(month).padStart(2, "0")}-31`;

    const { data: vendas } = await supabase
      .from("sales")
      .select("period, amount")
      .eq("store_id", storeId)
      .gte("sale_date", inicio)
      .lte("sale_date", fim);

    const linhas: LinhaPeriodo[] = [];

    for (const period of ["manha", "noite"] as const) {
      const meta =
        metas?.find((m) => m.period === period)?.goal_value || 0;

      const vendido =
        vendas
          ?.filter((v) => v.period === period)
          .reduce((s, v) => s + Number(v.amount), 0) || 0;

      linhas.push({
        period,
        meta,
        vendido,
      });
    }

    setDados(linhas);
    setLoading(false);
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  // 🔢 TOTAIS DA LOJA
  const metaTotal = dados.reduce((s, d) => s + d.meta, 0);
  const vendidoTotal = dados.reduce((s, d) => s + d.vendido, 0);
  const pctTotal =
    metaTotal > 0 ? (vendidoTotal / metaTotal) * 100 : 0;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{storeName}</h1>

      <p className="text-sm text-gray-600">
        Acompanhamento — {month}/{year}
      </p>

      {/* 🔷 TOTAL DA LOJA */}
      <div className="border rounded p-4 bg-gray-50 space-y-1">
        <div className="font-medium">Total da loja</div>

        <div className="text-sm">
          Meta:{" "}
          <strong>
            R$ {metaTotal.toLocaleString("pt-BR")}
          </strong>
        </div>

        <div className="text-sm">
          Vendido:{" "}
          <strong>
            R$ {vendidoTotal.toLocaleString("pt-BR")}
          </strong>
        </div>

        <div
          className={`font-semibold ${
            pctTotal >= 100
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {pctTotal.toFixed(1)}% atingido
        </div>
      </div>

      {/* 📊 TABELA POR PERÍODO */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Período</th>
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
                <td className="border p-2 capitalize font-medium">
                  {d.period}
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
