"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import MenuGerente from "@/components/gerente/MenuGerente";

export default function GerenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(true); // começa aberto

  useEffect(() => {
    async function checkRole() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "gerente") {
        router.replace("/vendedora");
        return;
      }

      setLoading(false);
    }

    checkRole();
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen relative">
      {/* BOTÃO ☰ SEMPRE VISÍVEL */}
      <button
        onClick={() => setMenuAberto(true)}
        className="fixed top-4 left-4 z-40 p-2 rounded hover:bg-gray-100"
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {/* MENU EM TELA CHEIA */}
      <MenuGerente
        aberto={menuAberto}
        fechar={() => setMenuAberto(false)}
      />

      {/* CONTEÚDO OCUPA A TELA TODA */}
      <main className="p-6">{children}</main>
    </div>
  );
}
