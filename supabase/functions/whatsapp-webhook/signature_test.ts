/**
 * Testes unitários para assinaturaWhatsappValida.
 *
 * Como rodar (requer Deno instalado):
 *   deno test supabase/functions/whatsapp-webhook/
 *
 * Os testes usam a própria WebCrypto para gerar assinaturas de referência,
 * garantindo que a função aceite o que a Meta enviaria e rejeite tudo o mais.
 */
import { assertEquals } from "jsr:@std/assert@1";
import { assinaturaWhatsappValida } from "./signature.ts";

// Helpers -----------------------------------------------------------------

/** Gera uma assinatura HMAC-SHA256 no formato "sha256=<hex>" para os testes. */
async function gerarAssinatura(secret: string, corpo: string): Promise<string> {
  const encoder = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, encoder.encode(corpo));
  const hex = Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

// Casos de teste ----------------------------------------------------------

Deno.test("aceita assinatura válida gerada com o mesmo secret e corpo", async () => {
  const secret = "meu-app-secret-super-seguro";
  const corpo = '{"entry":[{"changes":[{"value":{"messages":[{"from":"5511999999999","text":{"body":"oi"}}]}}]}]}';
  const header = await gerarAssinatura(secret, corpo);
  assertEquals(await assinaturaWhatsappValida(secret, corpo, header), true);
});

Deno.test("rejeita quando o corpo foi adulterado após a assinatura", async () => {
  const secret = "meu-app-secret-super-seguro";
  const corpoOriginal = '{"entry":[]}';
  const corpoAdulterado = '{"entry":[],"extra":true}';
  const header = await gerarAssinatura(secret, corpoOriginal);
  assertEquals(await assinaturaWhatsappValida(secret, corpoAdulterado, header), false);
});

Deno.test("rejeita quando o secret está errado", async () => {
  const secretCorreto = "secret-correto";
  const secretErrado = "secret-errado";
  const corpo = '{"entry":[]}';
  const header = await gerarAssinatura(secretCorreto, corpo);
  assertEquals(await assinaturaWhatsappValida(secretErrado, corpo, header), false);
});

Deno.test("rejeita quando o header está ausente (null)", async () => {
  assertEquals(await assinaturaWhatsappValida("qualquer-secret", "corpo", null), false);
});

Deno.test("rejeita quando o header está vazio", async () => {
  assertEquals(await assinaturaWhatsappValida("qualquer-secret", "corpo", ""), false);
});

Deno.test("rejeita quando o header não começa com sha256=", async () => {
  assertEquals(
    await assinaturaWhatsappValida("qualquer-secret", "corpo", "md5=abcdef1234567890"),
    false,
  );
});

Deno.test("fail-closed: rejeita tudo quando appSecret está vazio", async () => {
  const corpo = '{"entry":[]}';
  // Mesmo que houvesse um header aparentemente válido, sem secret tudo é rejeitado.
  const headerFalso = "sha256=aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
  assertEquals(await assinaturaWhatsappValida("", corpo, headerFalso), false);
  assertEquals(await assinaturaWhatsappValida("", corpo, null), false);
});

Deno.test("rejeita hex com comprimento ímpar no header", async () => {
  assertEquals(
    await assinaturaWhatsappValida("secret", "corpo", "sha256=abc"),
    false,
  );
});

Deno.test("rejeita hex com caracteres inválidos no header", async () => {
  assertEquals(
    await assinaturaWhatsappValida(
      "secret",
      "corpo",
      "sha256=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    ),
    false,
  );
});

Deno.test("rejeita hex válido porém de comprimento != 32 bytes (MAC curto)", async () => {
  assertEquals(await assinaturaWhatsappValida("secret", "corpo", "sha256=aabb"), false);
});

Deno.test("rejeita hex parcialmente inválido (parseInt é permissivo)", async () => {
  assertEquals(await assinaturaWhatsappValida("secret", "corpo", "sha256=1g"), false);
});

Deno.test("aceita corpo vazio quando a assinatura corresponde", async () => {
  const secret = "meu-app-secret-super-seguro";
  const corpo = "";
  const header = await gerarAssinatura(secret, corpo);
  assertEquals(await assinaturaWhatsappValida(secret, corpo, header), true);
});
