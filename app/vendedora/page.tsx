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
      setNameEdit(prof.name ?? "");

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
      console.error(error);
    } else {
      setName(nameEdit.trim());
      setModalNomeAberto(false);
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

    alert("Lançament
