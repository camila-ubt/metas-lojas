type Venda = {
  loja: string;
  periodo: "manha" | "noite";
  vendedora: string;
  meta: number;
  vendido: number;
};

export function calcularAcompanhamento(
  vendas: Venda[],
  diasPassados: number,
  diasMes: number
) {
  const geral = { meta: 0, vendido: 0 };

  const porLoja: any = {};
  const porPeriodo: any = {
    manha: { meta: 0, vendido: 0 },
    noite: { meta: 0, vendido: 0 },
  };
  const porVendedora: any = {};

  vendas.forEach(v => {
    // geral
    geral.meta += v.meta;
    geral.vendido += v.vendido;

    // por loja
    porLoja[v.loja] ??= { meta: 0, vendido: 0 };
    porLoja[v.loja].meta += v.meta;
    porLoja[v.loja].vendido += v.vendido;

    // por período
    porPeriodo[v.periodo].meta += v.meta;
    porPeriodo[v.periodo].vendido += v.vendido;

    // por vendedora
    porVendedora[v.vendedora] ??= {
      meta: 0,
      vendido: 0,
      porLoja: {},
      porPeriodo: { manha: 0, noite: 0 },
    };

    const vend = porVendedora[v.vendedora];

    vend.meta += v.meta;
    vend.vendido += v.vendido;

    vend.porLoja[v.loja] ??= 0;
    vend.porLoja[v.loja] += v.vendido;

    vend.porPeriodo[v.periodo] += v.vendido;
  });

  const vendedoras = Object.entries(porVendedora).map(
    ([nome, v]: any) => {
      const percentual = v.meta > 0 ? (v.vendido / v.meta) * 100 : 0;
      const projecao =
        diasPassados > 0 ? (v.vendido / diasPassados) * diasMes : 0;

      const melhorLoja = Object.entries(v.porLoja).sort(
        (a: any, b: any) => b[1] - a[1]
      )[0]?.[0];

      const melhorPeriodo =
        v.porPeriodo.manha >= v.porPeriodo.noite ? "manha" : "noite";

      return {
        nome,
        vendido: v.vendido,
        meta: v.meta,
        percentual,
        projecao,
        alerta: percentual < 60 || projecao < v.meta,
        melhorLoja,
        melhorPeriodo,
      };
    }
  );

  const destaque =
    vendedoras.length > 0
      ? [...vendedoras].sort((a, b) => b.percentual - a.percentual)[0]
      : null;

  return {
    geral,
    porLoja,
    porPeriodo,
    vendedoras,
    destaque,
  };
}

