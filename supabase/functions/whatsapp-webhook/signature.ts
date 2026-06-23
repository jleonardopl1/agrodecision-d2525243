/**
 * signature.ts — validação HMAC-SHA256 da assinatura enviada pela Meta no header
 * X-Hub-Signature-256 de cada requisição POST ao whatsapp-webhook.
 *
 * A Meta assina o corpo bruto da requisição com o App Secret do aplicativo
 * e envia o resultado no formato "sha256=<hex>". Este módulo verifica essa
 * assinatura usando a WebCrypto API (crypto.subtle) com comparação em tempo
 * constante, eliminando vulnerabilidades de timing attack que existiriam em
 * uma comparação direta de strings.
 *
 * Política fail-closed: sem o App Secret configurado, todos os POSTs são
 * rejeitados. Isso garante que uma configuração incompleta nunca deixe a
 * porta aberta.
 */

/**
 * Converte uma string hexadecimal para Uint8Array.
 * Retorna null se o hex tiver comprimento ímpar ou caracteres inválidos.
 */
function hexParaBytes(hex: string): Uint8Array | null {
  // Precisa ter comprimento par e conter APENAS dígitos hexadecimais.
  // parseInt é permissivo ("1g" viraria 1), então validamos o conjunto antes.
  if (hex.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]*$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Verifica se a assinatura HMAC-SHA256 enviada pela Meta é válida.
 *
 * @param appSecret       - O WHATSAPP_APP_SECRET configurado no ambiente.
 * @param rawBody         - O corpo bruto da requisição, como string.
 * @param signatureHeader - O valor do header X-Hub-Signature-256 (ex.: "sha256=abc123...").
 * @returns true se a assinatura for válida; false em qualquer outro caso.
 */
export async function assinaturaWhatsappValida(
  appSecret: string,
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  // Fail-closed: sem secret configurado, rejeita tudo.
  if (!appSecret) return false;

  // Header ausente, vazio ou sem o prefixo esperado.
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const hexRecebido = signatureHeader.slice("sha256=".length);
  const assinaturaBytes = hexParaBytes(hexRecebido);
  if (assinaturaBytes === null) return false;

  try {
    const encoder = new TextEncoder();

    // Importa o secret como chave HMAC-SHA256 com uso restrito a "verify".
    const chave = await crypto.subtle.importKey(
      "raw",
      encoder.encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // Comparação em tempo constante via crypto.subtle.verify — não usa === de string.
    return await crypto.subtle.verify(
      "HMAC",
      chave,
      assinaturaBytes,
      encoder.encode(rawBody),
    );
  } catch {
    // Qualquer falha inesperada da WebCrypto → fail-closed.
    return false;
  }
}
