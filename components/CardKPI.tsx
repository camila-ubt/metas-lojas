import { ReactNode } from "react";

type Props = {
  titulo: ReactNode;
  valor: string;
};

export function CardKPI({ titulo, valor }: Props) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="text-sm flex items-center gap-2">
        {titulo}
      </div>
      <div className="text-xl font-bold mt-1">{valor}</div>
    </div>
  );
}
