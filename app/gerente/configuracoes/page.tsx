"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ✅ lista de meses (visual bonito, valor numérico)
const meses = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export default function ConfiguracoesPage() {
  const hoje = new Date();
  const [month, setMonth] = useState(hoje.getMonth() + 1);
  const [year, setYear] = useState(hoje.getFullYear());

  const [stores, setStores] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  async function carregar() {
    setLoading(true);

    const { data: lojas } = await supabase
      .from("stores")
      .select("id, name")
      .order("id");

    const { data: metas } = await supabase
      .from("store_period_goals")
      .select("*")
      .eq("month", month)
      .eq("year", year);

    setStores(lojas || []);
    setGoals(metas || []);
    setLoading(false);
  }

  async function salvar() {
    for (const loja of stores) {
      for (const period of ["manha", "noite"]) {
        const value = document.getElementById(
          `goal-${loja.id}-${period}`
        ) as HTMLInputElement;

        if (!value) continue;

        await supabase.from("store_period_goals").upsert(
          {
            store_id: loja.id,
            period,
            month,
            year,
            goal_value: Number(value.value),
          },
          {
            onConflict: "store_id,period,month,year",
          }
        );
      }
    }

    alert("Metas salvas com sucesso!");
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Metas por Loja e Turno
      </h1>

      {/* 🎛️ Filtro mês/ano */}
      <div className="flex gap-3 items-center">
        {/* ✅ MÊS COM NOME */}
        <select
          className="border rounded p-2"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {meses.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* ANO */}
        <select
          className="border rounded p-2"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <button
          className="bg-black text-white rounded px-4 py-2"
          onClick={salvar}
        >
          Salvar metas
        </button>
      </div>

      {/* 🏬 Metas por loja */}
      <div className="space-y-6">
        {stores.map((loja) => {
          const metaManha =
            goals.find(
              (g) =>
                g.store_id === loja.id && g.period === "manha"
            )?.goal_value || 0;

          const metaNoite =
            goals.find(
              (g) =>
                g.store_id === loja.id && g.period === "noite"
            )?.goal_value || 0;

          return (
            <div
              key={loja.id}
              className="border rounded p-4 space-y-3"
            >
              <h2 className="font-semibold uppercase">
                {loja.name}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Manhã</label>
                  <input
                    id={`goal-${loja.id}-manha`}
                    defaultValue={metaManha}
                    type="number"
                    className="border rounded p-2 w-full"
                  />
                </div>

                <div>
                  <label className="text-sm">Noite</label>
                  <input
                    id={`goal-${loja.id}-noite`}
                    defaultValue={metaNoite}
                    type="number"
                    className="border rounded p-2 w-full"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
