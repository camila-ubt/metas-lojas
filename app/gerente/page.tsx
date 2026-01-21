"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Store = { id: number; name: string };

function monthKey(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function statusColor(pct: number) {
  if (pct >= 130) return "bg-blue-100 text-blue-900 border-blue-200";
  if (pct >= 120) return "bg-purple-100 text-purple-900 border-purple-200";
  if (pct >= 100) return "bg-green-100 text-green-900 border-green-200";
  if (pct >= 80) return "bg-yellow-100 text-yellow-900 border-yellow-200";
  return "bg-red-100 text-red-900 border-red-200";
}

export default function GerentePage() {
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [month, setMonth] = useState<Date>(new Date());

  const [targets, setTargets] = useState<Record<string, number>>({});
  const [achieved, setAchieved] = useState<Record<string, number>>({});

  const mKey = monthKey(month);

  const totalTarget = useMemo(
    () => Object.values(targets).reduce((a, b) => a + (b || 0), 0),
    [targets]
  );
  const totalAchieved = useMemo(
    () => Object.values(achieved).reduce((a, b) => a + (b || 0), 0),
    [achieved]
  );
  const totalPct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sess.session.user.id)
        .single();

      if (error || !prof || prof.role !== "gerente") {
        setRoleOk(false);
        setLoading(false);
        return;
      }

      setRoleOk(true);
      const { data: st } = await supabase.from("stores").select("id,name").order("id");
      setStores((st as Store[]) || []);
      setLoading(false);
    })();
  }, []);

  async function loadMonthData() {
    const { data: t } = await supabase
      .from("store_targets")
      .select("store_id,period,target_value")
      .eq("month", mKey);

    const tMap: Record<string, number> = {};
    (t as any[] | null)?.forEach((r) => {
      tMap[`${r.store_id}_${r.period}`] = Number(r.target_value || 0);
    });

    const start = mKey;
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    const { data: s } = await supabase
      .from("sales")
      .select("store_id,period,amount")
      .gte("sale_date", start)
      .lt("sale_date", end);

    const aMap: Record<string, number> = {};
    (s as any[] | null)?.forEach((r) => {
      const keyBase = `${r.store_id}`;
      const period = r.period || "";
      const amount = Number(r.amount || 0);

      if (period === "dobrado") {
        const t1 = tMap[`${keyBase}_manha`] || 0;
        const t2 = tMap[`${keyBase}_noite`] || 0;
        tMap[`${keyBase}_dobrado`] = t1 + t2;
        aMap[`${keyBase}_dobrado`] = (aMap[`${keyBase}_dobrado`] || 0) + amount;
      } else if (period.includes("às")) {
        const [hi, hf] = period.split(" às ");
        const [h1, m1] = hi.split(":").map(Number);
        const [h2, m2] = hf.split(":").map(Number);
        const ini = h1 + m1 / 60;
        const fim = h2 + m2 / 60;

        const manhaIni = 10, manhaFim = 16;
        const noiteIni = 16, noiteFim = 22;
        const manhaDur = Math.max(0, Math.min(manhaFim, fim) - Math.max(manhaIni, ini));
        const noiteDur = Math.max(0, Math.min(noiteFim, fim) - Math.max(noiteIni, ini));

        const pctManha = manhaDur / 6;
        const pctNoite = noiteDur / 6;

        const t1 = (tMap[`${keyBase}_manha`] || 0) * pctManha;
        const t2 = (tMap[`${keyBase}_noite`] || 0) * pctNoite;

        const totalTarget = t1 + t2;

        tMap[`${keyBase}_${period}`] = totalTarget;
        aMap[`${keyBase}_${period}`] = amount;
      } else {
        const key = `${keyBase}_${period}`;
        aMap[key] = (aMap[key] || 0) + amount;
      }
    });

    setTargets(tMap);
    setAchieved(aMap);
  }

  useEffect(() => {
    if (roleOk) loadMonthData();
  }, [roleOk, mKey]);

  return <div className="p-6">[Dashboard atualizada com metas dobradas e personalizadas]</div>;
}