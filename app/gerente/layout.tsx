"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import MenuGerente from "@/components/gerente/MenuGerente";

const HEADER_HEIGHT = 56; // altura real do header

export default function GerenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(true);

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
    <div className="min-h-screen bg-gray-50">
      {/* HEADER FIXO */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center bg-white border-b px-4"
        style={{ height: HEADER_HEIGHT }}
      >
        <button
          onClick={() => setMenuAberto(true)}
          className="p-2 rounded hover:bg-gray-100"
          aria-label="Abrir menu"
        >
          ☰
        </button>
      </header>

      {/* MENU OVERLAY */}
      <MenuGerente
        aberto={menuAberto}
        fechar={() => setMenuAberto(false)}
        topOffset={HEADER_HEIGHT}
      />

      {/* CONTEÚDO — SEMPRE ABAIXO DO HEADER */}
      <main
        className="px-4 pb-6"
        style={{ paddingTop: HEADER_HEIGHT + 16 }}
      >
        {children}
      </main>
    </div>
  );
}
