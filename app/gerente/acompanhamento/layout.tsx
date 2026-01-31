import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acompanhamento de Metas",
};

export default function AcompanhamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
