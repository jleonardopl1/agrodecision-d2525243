import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Commodity } from "@/lib/commodities";
import { useAuth, useCooperado } from "@/hooks/use-auth";

export type Cotacao = Tables<"cotacoes_cache">;
export type SinalIA = Tables<"sinais_ia">;
export type Cambio = Tables<"cambio_cache">;
export type CustoProducao = Tables<"custos_producao">;

const REFRESH_MS = 5 * 60 * 1000; // cotação atualiza a cada 15min no worker

/** Mantém apenas a primeira ocorrência (mais recente) por chave. */
function firstByKey<T>(rows: T[], key: (row: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const k = key(row);
    if (!map.has(k)) map.set(k, row);
  }
  return map;
}

/** Cotação spot nacional mais recente por commodity. */
export function useCotacoes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cotacoes"],
    enabled: !!user,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes_cache")
        .select("*")
        .eq("tipo", "spot")
        .is("regiao", null)
        .order("capturado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      return firstByKey(data ?? [], (c) => c.commodity);
    },
  });
}

/** Último sinal de IA por commodity. */
export function useSinais() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sinais"],
    enabled: !!user,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sinais_ia")
        .select("*")
        .order("gerado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return firstByKey(data ?? [], (s) => s.commodity);
    },
  });
}

/** Câmbio mais recente por par (USD/BRL, EUR/BRL). */
export function useCambio() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cambio"],
    enabled: !!user,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cambio_cache")
        .select("*")
        .order("capturado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return firstByKey(data ?? [], (c) => c.par);
    },
  });
}

/** Períodos de visualização do histórico (janela de tempo). */
export type PeriodoHistorico = "15min" | "dia" | "semana" | "mes" | "ano";

const PERIODO_HORAS: Record<PeriodoHistorico, number> = {
  "15min": 6,        // últimas 6h (intervalos de ~15min)
  dia: 24,           // últimas 24h
  semana: 24 * 7,    // 7 dias
  mes: 24 * 30,      // 30 dias
  ano: 24 * 365,     // 12 meses
};

/**
 * Histórico de preços (spot nacional) para o gráfico, em ordem cronológica,
 * dentro da janela do período escolhido. A agregação por bucket fica no gráfico.
 */
export function useHistoricoPrecos(commodity: Commodity, periodo: PeriodoHistorico = "mes") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["historico", commodity, periodo],
    enabled: !!user,
    queryFn: async () => {
      const desde = new Date(Date.now() - PERIODO_HORAS[periodo] * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from("cotacoes_cache")
        .select("preco, capturado_em, unidade")
        .eq("commodity", commodity)
        .eq("tipo", "spot")
        .is("regiao", null)
        .gte("capturado_em", desde)
        .order("capturado_em", { ascending: false })
        .limit(1500);
      if (error) throw error;
      return (data ?? []).reverse();
    },
  });
}

/** Custos de produção do cooperado logado (base da margem). */
export function useCustos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["custos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custos_producao")
        .select("*")
        .eq("cooperado_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Commodities ativas na cooperativa do usuário (commodities_config). */
export function useCommoditiesAtivas() {
  const { data: cooperado } = useCooperado();
  return useQuery({
    queryKey: ["commodities-config", cooperado?.cooperativa_id],
    enabled: !!cooperado?.cooperativa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commodities_config")
        .select("*")
        .eq("cooperativa_id", cooperado!.cooperativa_id);
      if (error) throw error;
      return data ?? [];
    },
  });
}
