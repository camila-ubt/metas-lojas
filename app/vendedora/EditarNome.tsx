"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EditarNome() {
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  // 1️⃣ Carrega o nome atual
  useEffect(() => {
    const carregarPerfil = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setNome(data.nome ?? "");
      }
    };

    carregarPerfil();
  }, []);

  // 2️⃣ SALVAR (AQUI está o update 👇)
  const salvarNome = async () => {
    if (!nome.trim()) {
      alert("O nome não pode ficar vazio");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim() })
      .eq("id", user.id); // 👈 UPDATE ACONTECE AQUI

    setLoading(false);

    if (error) {
      alert("Erro ao salvar nome");
      console.error(error);
    } else {
      alert("Nome atualizado com sucesso!");
    }
  };

  return (
    <div className="space-y-2 max-w-sm">
      <label className="font-medium">Seu nome no sistema</label>

      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="border rounded px-3 py-2 w-full"
        placeholder="Digite seu nome"
      />

      <button
        onClick={salvarNome}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}
