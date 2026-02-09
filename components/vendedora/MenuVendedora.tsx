"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  aberto: boolean;
  fechar: () => void;
  topOffset: number;
};

export default function MenuVendedora({
  aberto,
  fechar,
  topOffset,
}: Props) {
  const router = useRouter();
  const [nome, setNome] = useState<string>("");

  useEffect(() => {
    if (!aberto) return;

    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      if (!userId) return;

      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .single();

      if (data?.name) setNome(data.name);
    })();
  }, [aberto]);

  if (!aberto) return null;

  function irPara(href: string) {
    fechar();
    router.push(href);
  }

  async function sair() {
    fechar();
    await supabase.auth.signOut();
    router.replace("/");
  }

  function Item({ label, href }: { label: string; href: string }) {
    return (
      <button
        onClick={() => irPara(href)}
        className="w-full text-left text-lg px-6 py-4 rounded hover:bg-gray-100"
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 bg-white flex flex-col items-center justify-center"
      style={{ top: topOffset }}
    >
      {/* CABEÇALHO DO MENU */}
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500">Vendedora</p>
        <p className="text-lg font-semibold">
          {nome || "—"}
        </p>
      </div>

      {/* ITENS DA VENDEDORA */}
      <div className="w-full max-w-sm space-y-2">
        <Item label="Lançar vendas" href="/vendedora" />
        {/* futuro */}
        {/* <Item label="Meu desempenho" href="/vendedora/desempenho" /> */}
      </div>

      <button
        onClick={sair}
        className="mt-8 text-red-600 font-medium"
      >
        Sair
      </button>
    </div>
  );
}
