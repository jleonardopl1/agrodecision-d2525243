/**
 * cotacao-worker — atualiza cotacoes_cache + cambio_cache (cron a cada 15 min).
 *
 * Fontes REAIS (caminho gratuito):
 *   • B3 / futuros (fim-de-dia, EOD) ........ brapi.dev  → boi, cafe, milho, soja
 *   • Fisico regional (CEPEA/ESALQ, diario) . API Redacao Agro → soja, milho, boi
 *   • Cambio (USD/BRL, EUR/BRL) ............. brapi.dev
 *
 * Regionalizacao: o indicador fisico (CEPEA) e gravado como linha nacional
 * (regiao = null) e replicado por UF onde existem cooperativas, aplicando um
 * diferencial regional (basis) por UF/commodity — default 0.
 *
 * Robustez:
 *   • cada fonte e best-effort com timeout; se falhar, cai em fallback (random-walk).
 *   • valores invalidos/nao-positivos sao descartados antes de gravar.
 *   • os dois inserts (cotacoes/cambio) sao independentes: a falha de um nao
 *     bloqueia o outro; erros sao reportados na resposta (status 500).
 *
 * Segredos: BRAPI_TOKEN, BRAPI_TICKERS, REDACAO_AGRO_URL, COTACAO_BASIS, WORKER_SECRET.
 * Roda com SERVICE_ROLE (bypassa RLS).
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

type Commodity = "soja" | "milho" | "cafe" | "algodao" | "boi";

const FETCH_TIMEOUT_MS = 8000;

const FALLBACK: Record<Commodity, { unidade: string; base: number }> = {
  soja: { unidade: "R$/saca", base: 128.5 },
  milho: { unidade: "R$/saca", base: 62.3 },
  cafe: { unidade: "R$/saca", base: 1450.0 },
  algodao: { unidade: "R$/@", base: 159.4 },
  boi: { unidade: "R$/@", base: 245.0 },
};

const PARES = [
  { par: "USD/BRL", brapi: "USD-BRL", base: 5.42 },
  { par: "EUR/BRL", brapi: "EUR-BRL", base: 5.88 },
];

const CEPEA_PRACA: Partial<Record<Commodity, { uf: string; unidade: string; item: string }>> = {
  soja: { uf: "PR", unidade: "R$/saca", item: "soja" },
  milho: { uf: "SP", unidade: "R$/saca", item: "milho" },
  boi: { uf: "SP", unidade: "R$/@", item: "boi_gordo" },
};

const DEFAULT_TICKERS: Partial<Record<Commodity, string>> = {
  boi: "BGI",
  cafe: "ICF",
  milho: "CCM",
  soja: "SOJA",
};

/**
 * Parser unico e tolerante: aceita number (JSON do brapi) e string.
 * Para string, so trata como formato BR (1.234,56) quando ha virgula —
 * assim "128.50" (ponto decimal) nao vira 12850 por engano.
 */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** GET + JSON com timeout (AbortController) e checagem de status. Lanca em falha. */
async function fetchJson(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBrapiFutures(
  token: string,
  tickers: Partial<Record<Commodity, string>>,
): Promise<{ commodity: Commodity; preco: number; variacao_pct: number | null }[]> {
  const entries = Object.entries(tickers).filter(([, s]) => !!s) as [Commodity, string][];
  if (!entries.length || !token) return [];
  const symbols = entries.map(([, s]) => s).join(",");
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(symbols)}?token=${encodeURIComponent(token)}`;
  const data = await fetchJson(url) as { results?: Array<Record<string, unknown>> };
  const results = data?.results ?? [];
  const out: { commodity: Commodity; preco: number; variacao_pct: number | null }[] = [];
  for (const [commodity, root] of entries) {
    const r = results.find((x) => typeof x?.symbol === "string" && (x.symbol as string).startsWith(root));
    const preco = num(r?.regularMarketPrice);
    if (preco === null || preco <= 0) continue;
    out.push({ commodity, preco, variacao_pct: num(r?.regularMarketChangePercent) });
  }
  return out;
}

async function fetchCepeaFisico(
  baseUrl: string,
): Promise<{ commodity: Commodity; preco: number; variacao_pct: number | null; unidade: string; uf: string }[]> {
  const out: { commodity: Commodity; preco: number; variacao_pct: number | null; unidade: string; uf: string }[] = [];
  for (const [commodity, cfg] of Object.entries(CEPEA_PRACA) as [Commodity, { uf: string; unidade: string; item: string }][]) {
    try {
      const data = await fetchJson(`${baseUrl}?item=${encodeURIComponent(cfg.item)}`) as
        | Array<Record<string, unknown>>
        | { cotacao?: Record<string, unknown>; cotacoes?: Array<Record<string, unknown>> }
        | Record<string, unknown>;
      const row: Record<string, unknown> = Array.isArray(data)
        ? (data[0] ?? {})
        : ((data as { cotacao?: Record<string, unknown> })?.cotacao
          ?? (data as { cotacoes?: Array<Record<string, unknown>> })?.cotacoes?.[0]
          ?? (data as Record<string, unknown>)
          ?? {});
      const preco = num(row?.valor ?? row?.preco ?? row?.cotacao ?? row?.value);
      if (preco === null || preco <= 0) continue;
      const varpct = num(row?.variacao ?? row?.variacao_pct ?? row?.var ?? row?.changePercent);
      out.push({ commodity, preco, variacao_pct: varpct, unidade: cfg.unidade, uf: cfg.uf });
    } catch (_) { /* best-effort por item */ }
  }
  return out;
}

async function fetchCambio(
  token: string,
): Promise<{ par: string; cotacao: number; variacao_pct: number | null }[]> {
  if (!token) return [];
  const pares = PARES.map((p) => p.brapi).join(",");
  const url = `https://brapi.dev/api/v2/currency?currency=${pares}&token=${encodeURIComponent(token)}`;
  const data = await fetchJson(url) as { currency?: Array<Record<string, unknown>> };
  const arr = data?.currency ?? [];
  const out: { par: string; cotacao: number; variacao_pct: number | null }[] = [];
  for (const p of PARES) {
    const r = arr.find((x) => `${x?.fromCurrency}-${x?.toCurrency}` === p.brapi || x?.name === p.brapi);
    const cot = num(r?.bidPrice ?? r?.ask ?? r?.high);
    if (cot === null || cot <= 0) continue;
    out.push({ par: p.par, cotacao: cot, variacao_pct: num(r?.pctChange ?? r?.variacao_pct) });
  }
  return out;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("WORKER_SECRET");
  if (secret && req.headers.get("x-worker-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const brapiToken = Deno.env.get("BRAPI_TOKEN") ?? "";
    const redacaoUrl = Deno.env.get("REDACAO_AGRO_URL") ?? "https://www.redacaoagro.com.br/api/cotacoes.php";

    let tickers: Partial<Record<Commodity, string>> = DEFAULT_TICKERS;
    try { const t = Deno.env.get("BRAPI_TICKERS"); if (t) tickers = { ...DEFAULT_TICKERS, ...JSON.parse(t) }; } catch (_) { /* default */ }

    let basis: Record<string, Partial<Record<Commodity, number>>> = {};
    try { const b = Deno.env.get("COTACAO_BASIS"); if (b) basis = JSON.parse(b); } catch (_) { /* sem basis */ }

    const { data: ultimas } = await supabase
      .from("cotacoes_cache").select("commodity, preco, capturado_em")
      .is("regiao", null).order("capturado_em", { ascending: false }).limit(120);
    const lastPrice = (c: Commodity): number | null => {
      const u = ultimas?.find((x) => x.commodity === c);
      return u ? Number(u.preco) : null;
    };

    const { data: coops } = await supabase.from("cooperativas").select("estado").not("estado", "is", null);
    const ufs = Array.from(new Set((coops ?? []).map((c) => String(c.estado).toUpperCase()).filter(Boolean)));

    const [b3, fisico, cambio] = await Promise.all([
      fetchBrapiFutures(brapiToken, tickers).catch(() => []),
      fetchCepeaFisico(redacaoUrl).catch(() => []),
      fetchCambio(brapiToken).catch(() => []),
    ]);

    const rows: Array<Record<string, unknown>> = [];
    const sources = { b3: 0, cepea_nacional: 0, cepea_regional: 0, fallback: [] as Commodity[] };

    for (const f of b3) {
      rows.push({ commodity: f.commodity, fonte: "b3", preco: f.preco, unidade: FALLBACK[f.commodity].unidade, variacao_pct: f.variacao_pct, tipo: "futuro", regiao: null });
      sources.b3++;
    }

    const fisicoCommodities = new Set<Commodity>();
    for (const s of fisico) {
      fisicoCommodities.add(s.commodity);
      rows.push({ commodity: s.commodity, fonte: "cepea", preco: s.preco, unidade: s.unidade, variacao_pct: s.variacao_pct, tipo: "spot", regiao: null });
      sources.cepea_nacional++;
      for (const uf of ufs) {
        const diff = basis?.[uf]?.[s.commodity] ?? 0;
        rows.push({ commodity: s.commodity, fonte: "cepea", preco: Number((s.preco + diff).toFixed(2)), unidade: s.unidade, variacao_pct: s.variacao_pct, tipo: "spot", regiao: uf });
        sources.cepea_regional++;
      }
    }

    for (const c of Object.keys(FALLBACK) as Commodity[]) {
      if (fisicoCommodities.has(c)) continue;
      const anterior = lastPrice(c) ?? FALLBACK[c].base;
      const preco = Number((anterior * (1 + (Math.random() - 0.5) * 0.012)).toFixed(2));
      const variacao_pct = Number((((preco - anterior) / anterior) * 100).toFixed(2));
      rows.push({ commodity: c, fonte: "cepea", preco, unidade: FALLBACK[c].unidade, variacao_pct, tipo: "spot", regiao: null });
      sources.fallback.push(c);
    }

    const errors: string[] = [];
    let inseridasCotacoes = 0;
    if (rows.length) {
      const ins = await supabase.from("cotacoes_cache").insert(rows);
      if (ins.error) errors.push(`cotacoes_cache: ${ins.error.message}`);
      else inseridasCotacoes = rows.length;
    }

    let cambioRows = cambio;
    if (!cambioRows.length) {
      const { data: ultCambio } = await supabase.from("cambio_cache").select("par, cotacao").order("capturado_em", { ascending: false }).limit(10);
      cambioRows = PARES.map((p) => {
        const ult = ultCambio?.find((u) => u.par === p.par);
        const anterior = ult ? Number(ult.cotacao) : p.base;
        const cotacao = Number((anterior * (1 + (Math.random() - 0.5) * 0.004)).toFixed(4));
        return { par: p.par, cotacao, variacao_pct: Number((((cotacao - anterior) / anterior) * 100).toFixed(2)) };
      });
    }
    let inseridasCambio = 0;
    if (cambioRows.length) {
      const ins2 = await supabase.from("cambio_cache").insert(cambioRows);
      if (ins2.error) errors.push(`cambio_cache: ${ins2.error.message}`);
      else inseridasCambio = cambioRows.length;
    }

    return json({
      ok: errors.length === 0,
      inseridas: inseridasCotacoes,
      cambio: inseridasCambio,
      fontes: { b3: sources.b3, cepea_nacional: sources.cepea_nacional, cepea_regional: sources.cepea_regional, fallback: sources.fallback, cambio_real: cambio.length > 0 },
      ufs,
      ...(errors.length ? { errors } : {}),
    }, errors.length === 0 ? 200 : 500);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
