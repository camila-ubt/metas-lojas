"use client";


import Link from "next/link";


export default function GerenteHome() {
return (
<main className="p-6 space-y-6">
<h1 className="text-2xl font-bold">Painel da Gerente</h1>


<div className="grid gap-4">
<Link
href="/gerente/acompanhamento"
className="block p-4 border rounded-xl hover:bg-gray-50"
>
✨ Acompanhamento das metas e projeção do mês
</Link>


<Link
href="/gerente/vendas"
className="block p-4 border rounded-xl hover:bg-gray-50"
>
📈 Relatórios de vendas (total, loja, vendedora)
</Link>


<Link
href="/gerente/graficos"
className="block p-4 border rounded-xl hover:bg-gray-50"
>
📊 Gráficos de desempenho
</Link>


<Link
href="/gerente/exportar"
className="block p-4 border rounded-xl hover:bg-gray-50"
>
📃 Exportar dados (CSV/Excel)
</Link>


<Link
href="/gerente/metas"
className="block p-4 border rounded-xl hover:bg-gray-50"
>
✏️ Editar metas por loja e regras de comissão
</Link>
</div>
</main>
);
}