// Supabase Edge Function (Deno): legge i kg dal display della bilancia del carro miscelatore.
//
// Richiesta:  POST { immagini: [{ media_type: "image/jpeg", data: "<base64>" }, ...] }  (max 6)
// Risposta:   { letture: [{ foto: 1, leggibile: true, kg: 4310, nota: "" }, ...] }
//
// Segreto richiesto:  supabase secrets set ANTHROPIC_API_KEY=...
// Pubblicazione:      supabase functions deploy leggi-pesate
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic(); // legge ANTHROPIC_API_KEY dall'ambiente

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  properties: {
    letture: {
      type: "array",
      items: {
        type: "object",
        properties: {
          foto: { type: "integer", description: "Numero della foto, a partire da 1, nell'ordine ricevuto" },
          leggibile: { type: "boolean", description: "true se il numero sul display si legge con certezza" },
          kg: { type: "number", description: "Valore in kg mostrato sul display (0 se non leggibile)" },
          nota: { type: "string", description: "Breve nota in italiano se c'è un dubbio, altrimenti stringa vuota" },
        },
        required: ["foto", "leggibile", "kg", "nota"],
        additionalProperties: false,
      },
    },
  },
  required: ["letture"],
  additionalProperties: false,
};

const SYSTEM = `Leggi il peso mostrato sul display di una bilancia per carro miscelatore (unifeed), ad esempio una centralina iFeed della Label.
Per ogni foto riporta il numero grande in kg mostrato sul display LCD, in genere accompagnato dalla scritta "PESO TOTALE".
Ignora gli altri schermi presenti nella cabina (telecamere, cruscotto del trattore, scritte come "NO SIGNAL").
Il display usa cifre a segmenti: distingui con attenzione 1 e 7, 5 e 6, 8 e 0, e leggi tutte le cifre.
Se il display non è visibile o un numero non è leggibile con certezza, imposta leggibile=false e spiega il motivo nella nota.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ errore: "Metodo non consentito" }, 405);

  let immagini: { media_type: string; data: string }[];
  try {
    ({ immagini } = await req.json());
  } catch {
    return json({ errore: "Richiesta non valida" }, 400);
  }
  if (!Array.isArray(immagini) || immagini.length === 0 || immagini.length > 6) {
    return json({ errore: "Servono da 1 a 6 immagini" }, 400);
  }

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  immagini.forEach((img, i) => {
    content.push({ type: "text", text: `Foto ${i + 1}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.media_type as "image/jpeg", data: img.data },
    });
  });
  content.push({ type: "text", text: `Riporta la lettura di ciascuna delle ${immagini.length} foto.` });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // se la richiesta viene rifiutata, il server riprova con il modello consigliato
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") return json({ errore: "Lettura rifiutata dal servizio" }, 502);
    if (response.stop_reason === "max_tokens") return json({ errore: "Risposta incompleta" }, 502);

    const testo = response.content.find((b) => b.type === "text");
    if (!testo || testo.type !== "text") return json({ errore: "Risposta vuota" }, 502);
    return json(JSON.parse(testo.text));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ errore: "Troppe richieste, riprova tra poco" }, 429);
    if (err instanceof Anthropic.AuthenticationError) return json({ errore: "Chiave del servizio non valida" }, 500);
    if (err instanceof Anthropic.APIError) return json({ errore: `Errore del servizio (${err.status})` }, 502);
    return json({ errore: "Errore imprevisto" }, 500);
  }
});
