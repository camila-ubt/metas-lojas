"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function VendedoraPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [stores, setStores] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date());
  const [sales, setSales] = useState<Record<string, string>>(/** key = YYYY-MM-DD_period */ {});
  const [presencas, setPresencas] = useState<Record<string, string>>(/** key = YYYY-MM-DD */ {});

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const id = session.session?.user.id;
      if (!id) return;
      setUserId(id);

      const { data: prof } = await supabase.from("profiles").select("name, role").eq("id", id).single();
      if (!prof || prof.role !== "vendedora") {
        window.location.href = "/";
        return;
      }

      setName(prof.name);

      const { data: st } = await supabase.from("stores").select("id, name").order("id");
      setStores(st || []);

      setLoading(false);
    })();
  }, []);

  const diasDoMes = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
    return d.toISOString().slice(0, 10);
  });

  function setVenda(dia: string, period: string, valor: string) {
    setSales((prev) => ({ ...prev, [`${dia}_${period}`]: valor }));
  }

  function setTipoDia(dia: string, tipo: string) {
    setPresencas((prev) => ({ ...prev, [dia]: tipo }));
  }

  async function salvarTudo() {
    if (!userId) return;
    const vendas: any[] = [];
    const presencasData: any[] = [];

    for (const [chave, valor] of Object.entries(sales)) {
      const [dia, period] = chave.split("_");
      const num = parseFloat(valor.replace(",", "."));
      if (!isNaN(num) && num > 0) {
        for (const loja of stores) {
          vendas.push({
            seller_id: userId,
            store_id: loja.id,
            period,
            sale_date: dia,
            amount: num,
          });
        }
      }
    }

    for (const [dia, tipo] of Object.entries(presencas)) {
      if (tipo) {
        presencasData.push({ seller_id: userId, day: dia, type: tipo });
      }
    }

    if (vendas.length > 0) {
      await supabase.from("sales").upsert(vendas, {
        onConflict: "seller_id,sale_date,store_id,period",
      });
    }

    if (presencasData.length > 0) {
      await supabase.from("seller_days").upsert(presencasData, {
        onConflict: "seller_id,day",
      });
    }

    alert("Lançamentos salvos!");
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <main className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Olá, {name}</h1>

      <div className="flex items-center gap-2">
        <label>Mês:</label>
        <input
          type="month"
          value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            setMonth(new Date(y, m - 1, 1));
          }}
          className="border rounded p-2"
        />
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-1">Dia</th>
            <th className="border p-1">Período</th>
            <th className="border p-1">Valor Vendido</th>
            <th className="border p-1">Tipo de Dia</th>
          </tr>
        </thead>
        <tbody>
          {diasDoMes.map((dia) => (
            ["manha", "noite"].map((period, idx) => (
              <tr key={`${dia}_${period}`} className={idx % 2 ? "bg-gray-50" : ""}>
                <td className="border px-2 py-1">{idx === 0 ? dia : ""}</td>
                <td className="border px-2 py-1">{period}</td>
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    className="w-full border rounded p-1"
                    step="0.01"
                    value={sales[`${dia}_${period}`] || ""}
                    onChange={(e) => setVenda(dia, period, e.target.value)}
                  />
                </td>
                <td className="border px-2 py-1">
                  {period === "manha" && (
                    <select
                      value={presencas[dia] || ""}
                      onChange={(e) => setTipoDia(dia, e.target.value)}
                      className="w-full border rounded p-1"
                    >
                      <option value="">--</option>
                      <option value="trabalhado">Trabalhado</option>
                      <option value="folga">Folga</option>
                      <option value="falta">Falta</option>
                    </select>
                  )}
                </td>
              </tr>
            ))
          ))}
        </tbody>
      </table>

      <button
        className="bg-black text-white px-4 py-2 rounded"
        onClick={salvarTudo}
      >
        Salvar Lançamentos
      </button>
    </main>
  );
}
