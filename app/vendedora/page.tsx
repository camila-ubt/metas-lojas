"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function VendedoraPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState<string>("");
  const [nameEdit, setNameEdit] = useState<string>("");
  const [modalNomeAberto, setModalNomeAberto] = useState(false);

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

  // 🔹 carregar dados (SEM BLOQUEIO)
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const id = session.session?.user.id;
      if (!id) return;

      setUserId(id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", id)
        .single();

      setName(prof?.name ?? "");
      setNameEdit(prof?.name ?? "");

      const { data: st } = await supabase
        .from("stores")
        .select("id, name")
        .order("id");

      setStores(st || []);
      setData((prev) => ({ ...prev, loja: st?.[0]?.id || "" }));

      setLoading(false);
    })();
  }, []);

  // ✏️ salvar nome
  async function salvarNome() {
    if (!nameEdit.trim()) {
      alert("O nome não pode ficar vazio.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ name: nameEdit.trim() })
      .eq("id", userId);

    if (error) {
      alert("Erro ao atualizar nome.");
    } else {
      setName(nameEdit.trim());
      setModalNomeAberto(false);
    }
  }

  // 💾 salvar lançamento
  async function salvar() {
    setErrorMsg("");

    if (!data.loja || !data.dia) return;

    if (data.periodo === "personalizado") {
      if (!data.horaInicio || !data.horaFim) {
        setErrorMsg("Preencha os horários.");
        return;
      }
      if (data.horaFim <= data.horaInicio) {
        setErrorMsg("Horário final inválido.");
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
        setErrorMsg(error.message);
        return;
      }
    } else if (parseFloat(data.valor.replace(",", ".")) > 0) {
      const period =
        data.periodo === "personalizado"
          ? `${data.horaInicio} às ${data.horaFim}`
          : data.periodo;

      const { error } = await supabase.from("sales").upsert(
        [
          {
            seller_id: sellerId,
            store_id: data.loja,
            sale_date: data.dia,
            period,
            amount: parseFloat(data.valor.replace(",", ".")),
          },
        ],
        { onConflict: "seller_id,sale_date,store_id,period" }
      );

      if (error) {
        setErrorMsg(error.message);
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
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Olá, {name}</h1>

        <button
          className="text-sm text-blue-600 underline"
          onClick={() => {
            setNameEdit(name);
            setModalNomeAberto(true);
          }}
        >
          Editar
        </button>
      </div>

      <div className="grid gap-3 max-w-md">
        {errorMsg && (
          <div className="text-red-600 text-sm font-medium">{errorMsg}</div>
        )}

        <label>Dia</label>
        <input
          type="date"
          className="border rounded p-2"
          value={data.dia}
          onChange={(e) =>
            setData((prev) => ({ ...prev, dia: e.target.value }))
          }
        />

        <label>Loja</label>
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

        <label>Período</label>
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
            <input
              type="time"
              className="border rounded p-2"
              value={data.horaInicio}
              onChange={(e) =>
                setData((prev) => ({ ...prev, horaInicio: e.target.value }))
              }
            />
            <input
              type="time"
              className="border rounded p-2"
              value={data.horaFim}
              onChange={(e) =>
                setData((prev) => ({ ...prev, horaFim: e.target.value }))
              }
            />
          </div>
        )}

        <label>Valor vendido (R$)</label>
        <input
          type="number"
          step="0.01"
          className="border rounded p-2"
          value={data.valor}
          onChange={(e) =>
            setData((prev) => ({ ...prev, valor: e.target.value }))
          }
        />

        <label>Tipo de dia</label>
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

      {modalNomeAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setModalNomeAberto(false)}
          />

          <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-sm z-10 space-y-4">
            <h2 className="text-lg font-semibold">Editar nome</h2>

            <input
              className="border rounded p-2 w-full"
              value={nameEdit}
              onChange={(e) => setNameEdit(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-200 rounded px-4 py-2"
                onClick={() => setModalNomeAberto(false)}
              >
                Cancelar
              </button>

              <button
                className="bg-black text-white rounded px-4 py-2"
                onClick={salvarNome}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
