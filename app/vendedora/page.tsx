"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function VendedoraPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [stores, setStores] = useState<any[]>([]);
  const [data, setData] = useState({
    dia: new Date().toISOString().slice(0, 10),
    loja: "",
    periodo: "manha",
    valor: "",
    tipoDia: "trabalhado",
    horaPersonalizada: ""
  });

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
      setData((prev) => ({ ...prev, loja: st?.[0]?.id || "" }));

      setLoading(false);
    })();
  }, []);

  async function salvar() {
    if (!userId || !data.loja || !data.dia) return;

    const inserts: any[] = [];

    if (data.tipoDia !== "trabalhado") {
      inserts.push({
        seller_id: userId,
        day: data.dia,
        type: data.tipoDia,
      });
      await supabase.from("seller_days").upsert(inserts, { onConflict: "seller_id,day" });
    } else if (parseFloat(data.valor.replace(",", ".")) > 0) {
      const sale = {
        seller_id: userId,
        store_id: data.loja,
        sale_date: data.dia,
        period: data.periodo,
        amount: parseFloat(data.valor.replace(",", "."))
      };
      await supabase.from("sales").upsert([sale], { onConflict: "seller_id,sale_date,store_id,period" });
    }

    alert("Lançamento salvo!");
    setData((prev) => ({ ...prev, valor: "", horaPersonalizada: "" }));
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Olá, {name}</h1>

      <div className="grid gap-3 max-w-md">
        <label className="text-sm font-medium">Dia</label>
        <input
          type="date"
          className="border rounded p-2"
          value={data.dia}
          onChange={(e) => setData((prev) => ({ ...prev, dia: e.target.value }))}
        />

        <label className="text-sm font-medium">Loja</label>
        <select
          className="border rounded p-2"
          value={data.loja}
          onChange={(e) => setData((prev) => ({ ...prev, loja: e.target.value }))}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label className="text-sm font-medium">Período</label>
        <select
          className="border rounded p-2"
          value={data.periodo}
          onChange={(e) => setData((prev) => ({ ...prev, periodo: e.target.value }))}
        >
          <option value="manha">Manhã</option>
          <option value="noite">Noite</option>
          <option value="dobrado">Dobrado</option>
          <option value="personalizado">Personalizado</option>
        </select>

        {data.periodo === "personalizado" && (
          <input
            type="text"
            placeholder="Ex: 11h às 17h"
            className="border rounded p-2"
            value={data.horaPersonalizada}
            onChange={(e) => setData((prev) => ({ ...prev, horaPersonalizada: e.target.value }))}
          />
        )}

        <label className="text-sm font-medium">Valor vendido (R$)</label>
        <input
          type="number"
          step="0.01"
          className="border rounded p-2"
          value={data.valor}
          onChange={(e) => setData((prev) => ({ ...prev, valor: e.target.value }))}
        />

        <label className="text-sm font-medium">Tipo de dia</label>
        <select
          className="border rounded p-2"
          value={data.tipoDia}
          onChange={(e) => setData((prev) => ({ ...prev, tipoDia: e.target.value }))}
        >
          <option value="trabalhado">Trabalhado</option>
          <option value="folga">Folga</option>
          <option value="falta">Falta</option>
        </select>

        <button
          className="bg-black text-white rounded p-2 mt-2"
          onClick={salvar}
        >
          Salvar Lançamento
        </button>
      </div>
    </main>
  );
}
