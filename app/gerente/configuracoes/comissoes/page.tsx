"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Regra = {
  id?: number;
  level: number;
  min_pct: number;
  percent: number;
  emoji: string;
  label: string;
};

export default function RegrasComissaoPage() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("commission_rules")
        .select("*")
        .order("min_pct", { ascending: true });

      if (error) {
        alert("Erro ao carregar regras: " + error.message);
      } else {
        setRegras((data as Regra[]) || []);
      }

      setCarregando(false);
    }

    carregar();
  }, []);

  function atualizarRegra(
    index: number,
    campo: keyof Regra,
    valor: string
  ) {
    const atualizadas = [...regras];
    const regra = { ...atualizadas[index] };

    if (campo === "level") {
      regra.level = parseInt(valor);
    } else if (campo === "min_pct" || campo === "percent") {
      regra[campo] = parseFloat(valor.replace(",", "."));
    } else if (campo === "emoji" || campo === "label") {
      regra[campo] = valor;
    }

    atualizadas[index] = regra;
    setRegras(atualizadas);
  }

  async function salvar() {
    const { error } = await supabase.from("commission_rules").upsert(regras, {
      onConflict: "level",
    });

    if (error) {
      alert("Erro ao salvar regras: " + error.message);
    } else {
      alert("Regras salvas com sucesso!");
    }
  }

  function adicionarNovaRegra() {
    const nova: Regra = {
      level: regras.length + 1,
      min_pct: 0,
      percent: 0,
      emoji: "💰",
      label: "",
    };

    setRegras([...regras, nova]);
  }

  if (carregando) {
    return <div className="p-6">Carregando…</div>;
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Regras de Comissão</h1>
        <button
          className="bg-black text-white rounded-lg px-4 py-2"
          onClick={salvar}
        >
          Salvar
        </button>
      </div>

      <div className="space-y-4">
        {regras.map((r, i) => (
          <div key={i} className="border p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <input
                className="border rounded p-2"
                value={r.emoji}
                onChange={(e) => atualizarRegra(i, "emoji", e.target.value)}
                placeholder="Emoji"
              />

              <input
                className="border rounded p-2"
                value={r.label}
                onChange={(e) => atualizarRegra(i, "label", e.target.value)}
                placeholder="Nome da Faixa"
              />

              <input
                type="number"
                step="0.01"
                className="border rounded p-2"
                value={r.min_pct}
                onChange={(e) =>
                  atualizarRegra(i, "min_pct", e.target.value)
                }
                placeholder="Mínimo (%)"
              />

              <input
                type="number"
                step="0.01"
                className="border rounded p-2"
                value={r.percent}
                onChange={(e) =>
                  atualizarRegra(i, "percent", e.target.value)
                }
                placeholder="% Comissão"
              />

              <input
                type="number"
                className="border rounded p-2"
                value={r.level}
                onChange={(e) => atualizarRegra(i, "level", e.target.value)}
                placeholder="Ordem"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        className="text-sm text-blue-600 underline"
        onClick={adicionarNovaRegra}
      >
        + Adicionar nova regra
      </button>
    </main>
  );
}
