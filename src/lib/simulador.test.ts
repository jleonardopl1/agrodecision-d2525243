import { describe, it, expect } from "vitest";
import { montarCarteira, simularVenda, type Producao, type Fixacao } from "@/lib/simulador";

describe("montarCarteira", () => {
  it("consolida produção e fixações por cultura/safra (preço médio e % vendido)", () => {
    const producoes: Producao[] = [
      { commodity: "soja", safra: "2024/25", producao_sacas: 1000, preco_alvo: null, margem_alvo_pct: null },
    ];
    const fixacoes: Fixacao[] = [
      { commodity: "soja", safra: "2024/25", sacas: 300, preco: 120 },
      { commodity: "soja", safra: "2024/25", sacas: 100, preco: 130 },
    ];

    const [pos] = montarCarteira(producoes, fixacoes);

    expect(pos.fixadoSacas).toBe(400);
    expect(pos.receitaTravada).toBe(49000); // 300×120 + 100×130
    expect(pos.precoMedioFixado).toBe(122.5); // 49000 / 400
    expect(pos.restanteSacas).toBe(600);
    expect(pos.pctVendido).toBeCloseTo(0.4);
  });

  it("limita restante em 0 e % vendido em 1 quando fixado passa da produção", () => {
    const [pos] = montarCarteira(
      [{ commodity: "milho", safra: "2024", producao_sacas: 100, preco_alvo: null, margem_alvo_pct: null }],
      [{ commodity: "milho", safra: "2024", sacas: 150, preco: 50 }],
    );

    expect(pos.restanteSacas).toBe(0);
    expect(pos.pctVendido).toBe(1);
  });

  it("sem produção informada: restante e % vendido ficam null, preço médio ainda calcula", () => {
    const [pos] = montarCarteira(
      [],
      [{ commodity: "cafe", safra: "2024", sacas: 50, preco: 1000 }],
    );

    expect(pos.producaoSacas).toBeNull();
    expect(pos.restanteSacas).toBeNull();
    expect(pos.pctVendido).toBeNull();
    expect(pos.precoMedioFixado).toBe(1000);
    expect(pos.fixadoSacas).toBe(50);
  });

  it("ordena por cultura e, dentro da cultura, safra mais recente primeiro", () => {
    const carteira = montarCarteira(
      [
        { commodity: "soja", safra: "2023/24", producao_sacas: 100, preco_alvo: null, margem_alvo_pct: null },
        { commodity: "soja", safra: "2024/25", producao_sacas: 200, preco_alvo: null, margem_alvo_pct: null },
        { commodity: "milho", safra: "2024", producao_sacas: 50, preco_alvo: null, margem_alvo_pct: null },
      ],
      [],
    );

    expect(carteira.map((p) => `${p.commodity}/${p.safra}`)).toEqual([
      "milho/2024",
      "soja/2024/25",
      "soja/2023/24",
    ]);
  });
});

describe("simularVenda", () => {
  it("calcula receita, lucro e margem quando há custo", () => {
    const r = simularVenda({ preco: 130, sacas: 100, custoPorSaca: 90 });

    expect(r.receita).toBe(13000);
    expect(r.margemPorSaca).toBe(40);
    expect(r.lucro).toBe(4000);
    expect(r.margemPct).toBeCloseTo(44.444, 2); // (130-90)/90 × 100
  });

  it("sem custo: lucro e margem ficam null, receita continua", () => {
    const r = simularVenda({ preco: 130, sacas: 100 });

    expect(r.receita).toBe(13000);
    expect(r.lucro).toBeNull();
    expect(r.margemPorSaca).toBeNull();
    expect(r.margemPct).toBeNull();
  });

  it("custo zero: margem por saca = preço, mas margem % fica null (evita divisão por zero)", () => {
    const r = simularVenda({ preco: 100, sacas: 10, custoPorSaca: 0 });

    expect(r.margemPorSaca).toBe(100);
    expect(r.lucro).toBe(1000);
    expect(r.margemPct).toBeNull();
  });

  it("usa o restante em aberto quando 'sacas' não é informado", () => {
    const r = simularVenda({ preco: 100, restanteSacas: 50 });

    expect(r.sacas).toBe(50);
    expect(r.receita).toBe(5000);
  });

  it("sem sacas nem restante: simula zero (não quebra)", () => {
    const r = simularVenda({ preco: 100 });

    expect(r.sacas).toBe(0);
    expect(r.receita).toBe(0);
  });
});
