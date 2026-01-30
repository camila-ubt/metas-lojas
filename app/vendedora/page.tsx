"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function VendedoraPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [stores, setStores] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [data, setData] = useState({
    dia: new Date().toISOString().slice(0, 10),
    loja: "",
    periodo: "manha",
    valor: "",
    tipoDia: "trabalhado",
    horaInicio: "",
    horaFim: "",
  });

  // 🔹 Carregar sessão, perfil e lojas
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const id = session.session?.user.id;

      if (!id) return;

      setUserId(id);

      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", id)
        .single();

      if (profError || !prof || prof.role !== "vendedora") {
        window.location.href = "/";
        return;
      }

      setName(prof.name ?? "");

      const { data: st } = await supabase
        .from("stores")
        .select("id, name")
        .order("id");

      setStores(st || []);
      setData((prev) => ({ ...prev, loja: st?.[0]?.id || "" }));

      setLoading(false);
    })();
  }, []);

  // ✏️ SALVAR NOME DA VENDEDORA
  async function salvarNome() {
    if (!name.trim()) {
      alert("O nome não pode ficar vazio.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", userId);

    if (error) {
      alert("Erro ao atualizar nome.");
      console.error(error);
    } else {
      alert("Nome atualizado com sucesso!");
    }
  }

  // 💾 SALVAR LANÇAMENTO
  async function salvar() {
    setErrorMsg("");

    if (!data.loja || !data.dia) return;

    if (data.periodo === "personalizado") {
      if (!data.horaInicio || !data.horaFim) {
        setErrorMsg("Preencha os horários de início e fim.");
        return;
      }
      if (data.horaFim <= data.horaInicio) {
        setErrorMsg("O horário de fim deve ser após o início.");
        return;
      }
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setErrorMsg("Usuário não autenticado.");
      return;
    }

    const sellerId = userData.user.id;

    if (data.tipoDia !== "trabalhado") {
      const { error } = await supabase.from("seller_days").upsert(
        [
          {
            seller_id: sellerId,
            day: data.dia,
            type: data.tipoDia,
          },
        ],
        { onConflict: "seller_id,day" }
      );

      if (error) {
        setErrorMsg("Erro ao salvar dia: " + error.message);
        return;
      }
    } else if (parseFloat(data.valor.replace(",", ".")) > 0) {
      const period =
        data.periodo === "personalizado"
          ? `${data.horaInicio} às ${data.horaFim}`
          : data.periodo;

      const sale = {
        seller_id: sellerId,
        store_id: data.loja,
        sale_date: data.dia,
        period,
        amount: parseFloat(data.valor.replace(",", ".")),
      };

      const { error } = await supabase
        .from("sales")
        .upsert([sale], {
          onConflict: "seller_id,sale_date,store_id,period",
        });

      if (error) {
        setErrorMsg("Erro ao salvar venda: " + error.message);
        return;
      }
    }

    alert("Lançamento salvo!");

    setData((prev) => ({
      ...prev,
      valor: "",
      horaInicio: "",
      horaFim: "",
    }));
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Olá, {name}</h1>

      {/* ✏️ EDITAR NOME */}
      <div className="max-w-md border rounded p-3 space-y-2">
        <label className="text-sm font-medium">Seu nome no sistema</label>

        <input
          className="border rounded p-2 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          className="bg-gray-800 text-white rounded px-3 py-1 text-sm"
          onClick={salvarNome}
        >
          Salvar nome
        </button>
      </div>

      {/* 🧾 LANÇAMENTO */}
      <div className="grid gap-3 max-w-md">
        {errorMsg && (
          <div className="text-red-600 text-sm font-medium">{errorMsg}</div>
        )}

        <label className="text-sm font-medium">Dia</label>
        <input
          type="date"
          className="border rounded p-2"
          value={data.dia}
          onChange={(e) =>
            setData((prev) => ({ ...prev, dia: e.target.value }))
          }
        />

        <label className="text-sm font-medium">Loja</label>
        <select
          className="border rounded p-2"
          value={data.loja}
          onChange={(e) =>
            setData((prev) => ({ ...prev, loja: e.target.value }))
          }
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium">Período</label>
        <select
          className="border rounded p-2"
          value={data.periodo}
          onChange={(e) =>
            setData((prev) => ({ ...prev, periodo: e.target.value }))
          }
        >
          <option value="manha">Manhã</option>
          <option value="noite">Noite</option>
          <option value="dobrado">Dobrado</option>
          <option value="personalizado">Personalizado</option>
        </select>

        {data.periodo === "personalizado" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs">Início</label>
              <input
                type="time"
                className="border rounded p-2 w-full"
                value={data.horaInicio}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    horaInicio: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs">Fim</label>
              <input
                type="time"
                className="border rounded p-2 w-full"
                value={data.horaFim}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    horaFim: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        )}

        <label className="text-sm font-medium">Valor vendido (R$)</label>
        <input
          type="number"
          step="0.01"
          className="border rounded p-2"
          value={data.valor}
          onChange={(e) =>
            setData((prev) => ({ ...prev, valor: e.target.value }))
          }
        />

        <label className="text-sm font-medium">Tipo de dia</label>
        <select
          className="border rounded p-2"
          value={data.tipoDia}
          onChange={(e) =>
            setData((prev) => ({ ...prev, tipoDia: e.target.value }))
          }
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
