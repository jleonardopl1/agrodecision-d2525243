/**
 * whatsapp-webhook — porta de entrada do chatbot no WhatsApp (Meta Cloud API).
 *
 * GET  : verificação do webhook (hub.challenge) com WHATSAPP_VERIFY_TOKEN.
 * POST : mensagens recebidas. Resolve o vínculo cooperado↔telefone; trata a 1ª
 *        mensagem como CÓDIGO de pareamento; encaminha o texto à function
 *        `chatbot` e responde via Graph API.
 *
 * Deploy: verify_jwt = false. Secrets: WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN,
 *   WHATSAPP_PHONE_NUMBER_ID, WORKER_SECRET, WHATSAPP_APP_SECRET (assinatura POST).
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const WORKER_SECRET = Deno.env.get("WORKER_SECRET") ?? "";
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";

async function sendMessage(to: string, text: string) {
  if (!WA_TOKEN || !PHONE_ID) return;
  await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
}

/**
 * Valida a assinatura HMAC-SHA256 que a Meta envia em X-Hub-Signature-256
 * ("sha256=<hex>"), calculada sobre o corpo cru com o App Secret. Sem essa
 * checagem qualquer um poderia forjar um POST com o telefone de outra pessoa em
 * `from` e agir na conta dela. Comparação em tempo constante.
 */
async function assinaturaValida(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const esperado = header.startsWith("sha256=") ? header.slice(7) : header;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinado = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(assinado)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ esperado.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // --- Verificação do webhook (configuração no painel da Meta) ---
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("ok");

  // Lê o corpo cru ANTES de parsear: a assinatura é sobre os bytes recebidos.
  const raw = await req.text();
  if (APP_SECRET && !(await assinaturaValida(raw, req.headers.get("X-Hub-Signature-256"), APP_SECRET))) {
    return new Response("invalid signature", { status: 401 });
  }
  if (!APP_SECRET) {
    console.warn("[whatsapp-webhook] WHATSAPP_APP_SECRET ausente — POST sem verificação de assinatura.");
  }

  let payload: {
    entry?: Array<{
      changes?: Array<{ value?: { messages?: Array<{ from?: string; text?: { body?: string } }> } }>;
    }>;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("ok");
  }

  const msg = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = msg?.from; // telefone do remetente (só dígitos)
  const texto = (msg?.text?.body ?? "").trim();
  if (!from || !texto) return new Response("ok"); // status updates etc.

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: vinculo } = await admin
    .from("chat_vinculos")
    .select("cooperado_id, verificado")
    .eq("canal", "whatsapp")
    .eq("chat_id", from)
    .maybeSingle();

  if (!vinculo) {
    const codigo = texto.toUpperCase().replace(/\s+/g, "");
    const { data: pendente } = await admin
      .from("chat_vinculos")
      .select("id, cooperado_id")
      .eq("canal", "whatsapp")
      .eq("codigo", codigo)
      .eq("verificado", false)
      .maybeSingle();

    if (!pendente) {
      await sendMessage(
        from,
        "Olá! Para conectar sua conta AgroDecision, abra o app em Conversa → Conectar WhatsApp e me envie aqui o código que aparecer. 🌱",
      );
      return new Response("ok");
    }

    const { error } = await admin
      .from("chat_vinculos")
      .update({ chat_id: from, verificado: true })
      .eq("id", pendente.id);
    if (error) {
      await sendMessage(from, "Não consegui confirmar o código. Gere um novo no app e tente de novo.");
      return new Response("ok");
    }
    await sendMessage(
      from,
      "Conta conectada! ✅ Me conte sua cultura, quanto espera colher e seu custo por saca, que eu te ajudo a decidir a melhor hora de vender.",
    );
    return new Response("ok");
  }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-worker-secret": WORKER_SECRET },
    body: JSON.stringify({ texto, cooperado_id: vinculo.cooperado_id, canal: "whatsapp" }),
  });
  const data = await resp.json().catch(() => ({ reply: "" }));
  await sendMessage(from, data.reply || "Tive um problema para responder agora. Pode repetir?");

  return new Response("ok");
});
