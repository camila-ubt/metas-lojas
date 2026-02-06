"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Pessoa = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  active: boolean;
};

export default function VendedorasPage() {
  const [lista, setLista] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);

    // 🔐 usuário logado (forma correta)
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    const userId = userData?.user?.id;

    if (userError || !userId) {
      window.location.href = "/";
      return;
    }

    // 🔐 valida gerente
    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (perfilError || perfil?.role !== "gerente") {
      window.location.href = "/";
      return;
    }

    // 👥 carrega vendedoras
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, active")
      .neq("role", "gerente")
      .order("name");

    if (error) {
      console.error(error);
      setLista([]);
    } else {
      setLista(data || []);
    }

    setLoading(false);
  }

  async function toggleAtiva(id: string, ativa: boolean) {
    await supabase
      .from("profiles")
      .update({ active: !ativa })
      .eq("id", id);

    setLista((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, active: !ativa } : p
      )
    );
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        Usuárias do sistema
      </h1>

      <table className="min-w-full border rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Nome</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Perfil</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Ação</th>
          </tr>
        </thead>

        <tbody>
          {lista.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-2">{p.name}</td>
              <td className="px-4 py-2">{p.email}</td>
              <td className="px-4 py-2">
                {p.role ?? "—"}
              </td>
              <td className="px-4 py-2">
                {p.active ? (
                  <span className="text-green-600 font-semibold">
                    Ativa
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold">
                    Inativa
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => toggleAtiva(p.id, p.active)}
                  className={`px-3 py-1 rounded text-white ${
                    p.active ? "bg-red-500" : "bg-green-500"
                  }`}
                >
                  {p.active ? "Desativar" : "Ativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {lista.length === 0 && (
        <p className="text-sm text-gray-500">
          Nenhuma usuária encontrada.
        </p>
      )}
    </div>
  );
}
