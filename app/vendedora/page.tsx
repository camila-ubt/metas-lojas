"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Store = { id: number; name: string };
type DayStatus = "normal" | "folga" | "falta";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Semana válida: DOMINGO → SÁBADO
 */
function isSameWeek(dateStr: string) {
  const today = new Date();
  const d = new Date(dateStr);

  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay()); // domingo
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6); // sábado
  end.setHours(23, 59, 59, 999);

  return d >= start && d <= end;
}

export default function VendedoraPage() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [period, setPeriod] = useState<"manha" | "noite">("manha");
  const [amount, setAmount] = useState<number>(0);
  const [dayStatus, setDayStatus] = useState<DayStatus>("normal");

  const [mySales, setMySales] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // 🔒 Proteção de rota
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sess.session.user.id)
        .single();

      if (prof?.role === "gerente") {
        window.location.href = "/gerente";
        return;
      }

      const { data: st } = await supabase
        .from("stores")
        .select("id,name")
        .order("id");

      const st2 = (st as Store[]) || [];
      setStores(st2);
      setSelectedStoreId(st2[0]?.id ?? null);

      await loadMySales();
      setLoading(false);
    })();
  }, []);

  async function loadMySales() {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;

    const { data } = await supabase
      .from("sales")
      .select("sale_date,store_id,period,amount")
      .eq("seller_id", user.id);

    setMySales(data || []);
  }

  // 🔁 Carrega valor existente ao mudar data/loja/período
  useEffect(() => {
    const found = mySales.find(
      (s) =>
        s.sale_date === selectedDate &&
        s.store_id === selectedStoreId &&
        s.period === period
    );
    setAmount(found ? Number(found.amount) : 0);
  }, [mySales, selectedDate, selectedStoreId, period]);

  // 💾 Salvar venda / folga / falta
  async function saveDay() {
    setMsg(null);

    // regra: só semana atual
    if (!isSameWeek(selectedDate)) {
      setMsg("Você só pode lançar ou editar dados da semana atual.");
      return;
    }

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user || !selectedStoreId) return;

    // 🔹 FOLGA ou FALTA
    if (dayStatus !== "normal") {
      const { error } = await supabase.from("seller_days").upsert({
        seller_id: user.id,
        day: selectedDate,
        status: dayStatus,
      });

      if (error) {
        setMsg("Erro ao registrar dia: " + error.message);
        return;
      }

      setMsg(
        dayStatus === "folga"
          ? "Folga registrada (não conta para meta nem comissão)."
          : "Falta registrada (conta contra a meta)."
      );
      return;
    }

    // 🔹 VENDA NORMAL
    const payload = {
      seller_id: user.id,
      sale_date: selectedDate,
      store_id: selectedStoreId,
      period,
      amount: Number(amount || 0),
    };

    const { error } = await supabase.from("sales").upsert(payload, {
      onConflict: "sale_date,store_id,period,seller_id",
    });

    if (error) {
      setMsg("Erro ao salvar venda: " + error.message);
      return;
    }

    setMsg("Venda salva com sucesso!");
    await loadMySales();
  }

  const totalDay = useMemo(() => {
    return mySales
      .filter((s) => s.sale_date === selectedDate)
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  }, [mySales, selectedDate]);

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Painel da Vendedora</h1>
          <p className="text-sm opacity-70">
            Semana válida: domingo a sábado
          </p>
        </div>

        <button
          className="border rounded-lg px-3 py-2"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          Sair
        </button>
      </header>

      <section className="border rounded-2xl p-4 space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm">Data</label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Loja</label>
            <select
              className="w-full border rounded-lg p-2"
              value={selectedStoreId ?? ""}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Período</label>
            <div className="flex gap-2">
              <button
                className={`flex-1 border rounded-lg p-2 ${
                  period === "manha" ? "bg-black text-white" : ""
                }`}
                onClick={() => setPeriod("manha")}
              >
                Manhã
              </button>
              <button
                className={`flex-1 border rounded-lg p-2 ${
                  period === "noite" ? "bg-black text-white" : ""
                }`}
                onClick={() => setPeriod("noite")}
              >
                Noite
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm">Status do dia</label>
            <select
              className="w-full border rounded-lg p-2"
              value={dayStatus}
              onChange={(e) => setDayStatus(e.target.value as DayStatus)}
            >
              <option value="normal">Normal</option>
              <option value="folga">Folga</option>
              <option value="falta">Falta</option>
            </select>
          </div>
        </div>

        {dayStatus === "normal" && (
          <div>
            <label className="text-sm">Total vendido (R$)</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg p-2"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value || 0))}
            />
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm opacity-70">
            Total do dia: <b>{formatBRL(totalDay)}</b>
          </div>
          <button
            className="bg-black text-white rounded-lg px-4 py-2"
            onClick={saveDay}
          >
            Salvar
          </button>
        </div>

        {msg && <div className="text-sm">{msg}</div>}
      </section>
    </main>
  );
}
