// AI Provider Soyutlama Katmanı
// Provider değiştirmek için yalnızca bu dosyayı güncelleyin.

export interface AIMessage {
  role: "user" | "model";
  content: string;
}

export interface AIGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseMimeType?: "application/json" | "text/plain";
}

export interface AIResponse {
  text: string;
  tokensUsed?: number;
  model: string;
}

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const FALLBACK_GEMINI_MODEL = "gemini-2.5-flash";

const AI_QUALITY_RULES = `KALİTE KURALLARI:
- Türkçe yaz — günlük dilde, samimi, finans koçu gibi. Resmi veya robot gibi cümleler kurma.
- ZORUNLU: Prompttaki gerçek rakamları kullan — gelir, gider, nakit akışı, tasarruf oranı, kategori tutarlarını doğrudan yaz. "Gelirinize göre..." gibi belirsiz ifadeler kullanma; "15.000 ₺ gelirinizle..." gibi somut söyle.
- Genel geçer tavsiye verme; her cümleyi kullanıcının gerçek verisine bağla.
- Veri yoksa bunu kısaca söyle ve uygulanabilir bir başlangıç önerisi sun.
- Summary alanı 2-4 cümle olsun: önce net teşhis (sayıyla), sonra neden önemli, sonra ana öneri.
- Her insight ve recommendation farklı bir konuya odaklansın; aynı fikri farklı başlıkla tekrarlama.
- Insight açıklamaları somut gözlem içersin; recommendation action alanları doğrudan yapılabilir adımlar olsun.
- estimatedImpact alanını doldur: para (₺), yüzde (%) veya zaman olarak ifade et.
- Action item üretirken ölçülebilir, küçük ve bu hafta yapılabilir görevler yaz.
- followUps alanına kullanıcının tıklayıp gönderebileceği 2-3 kısa soru ekle. Sorular MUTLAKA kullanıcının ağzından, birinci şahıs veya kısa emir kipiyle yazılsın (örn: "Borcumu nasıl kapatabilirim?", "3 aylık plan yap", "Aboneliklerimi göster"). ASLA "Sizin borcunuzu..." veya "Hedeflerinizi..." gibi AI perspektifinden yazma.`;

const PROFESSIONAL_ANSWER_RULES = `PROFESYONEL CEVAP KURALLARI:
- Kullanıcının sorduğu konuya doğrudan cevap ver; konu dışı hedef, borç veya kategori önerilerine kayma.
- Veri yoksa eksik veriyi tamamlamış gibi davranma; varsayımsal tutar, oran veya limit uydurma.
- Summary alanı 3-5 cümle olsun: net teşhis, neden önemli olduğu, veriye dayalı yorum ve ana öneri.
- Diagnosis explanation alanı summary'nin tekrarı olmasın; 4-7 cümlelik daha detaylı değerlendirme yaz.
- En az 3 farklı insight ve 4 farklı recommendation üret; aynı fikri farklı başlıklarla tekrar etme.
- Öneriler gerçekçi ve ölçülebilir olsun; "tüm net nakit akışını aktar" gibi aşırı öneriler verme.
- Kullanıcı market, ulaşım, kira, abonelik gibi belirli bir alan sorarsa cevabın çoğunu o alana odakla.`;

async function callGeminiWithModel(
  model: string,
  messages: AIMessage[],
  options: AIGenerateOptions = {}
): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const temperature = options.temperature ?? Number(process.env.AI_TEMPERATURE ?? "0.6");
  const maxOutputTokens = options.maxTokens ?? Number(process.env.AI_MAX_TOKENS ?? "3072");

  if (!apiKey || apiKey.includes("your-gemini-api-key")) {
    throw new Error("GEMINI_API_KEY ortam değişkeni tanımlı değil.");
  }

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (options.systemPrompt) {
    contents.push({
      role: "user",
      parts: [{ text: `[SYSTEM INSTRUCTION]\n${options.systemPrompt}\n[/SYSTEM INSTRUCTION]` }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Anlaşıldı. Talimatlarınıza uygun şekilde yardımcı olacağım." }],
    });
  }

  messages.forEach((msg) => {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.content }],
    });
  });

  const requestBody = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType:
        options.responseMimeType ??
        (options.systemPrompt?.includes("YALNIZCA geçerli JSON") ||
        options.systemPrompt?.includes("YALNIZCA ge") ||
        options.systemPrompt?.includes("YALNIZCA")
          ? "application/json"
          : "text/plain"),
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API hatası (${model}): ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
    usageMetadata?: {
      totalTokenCount?: number;
    };
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const tokensUsed = data.usageMetadata?.totalTokenCount;

  return { text, tokensUsed, model };
}

async function callGemini(
  messages: AIMessage[],
  options: AIGenerateOptions = {}
): Promise<AIResponse> {
  const requestedModel = (process.env.AI_MODEL ?? DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
  const fallbackModel = FALLBACK_GEMINI_MODEL;

  try {
    return await callGeminiWithModel(requestedModel, messages, options);
  } catch (error) {
    const shouldFallback =
      requestedModel !== fallbackModel &&
      error instanceof Error &&
      /Gemini API hatası|404|not found|model/i.test(error.message);

    if (!shouldFallback) {
      throw error;
    }

    return await callGeminiWithModel(fallbackModel, messages, options);
  }
}

export async function generateAIResponse(
  messages: AIMessage[],
  options: AIGenerateOptions = {}
): Promise<AIResponse> {
  return callGemini(messages, options);
}

export function cleanJSONText(raw: string): string {
  const text = raw.trim();
  const jsonMatch =
    text.match(/```(?:json)?\s*([\s\S]*?)```/) ??
    text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const candidate = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;
  const start = candidate.search(/[\[{]/);
  if (start === -1) return candidate;

  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) {
      return candidate
        .slice(start, i + 1)
        .replace(/,\s*([}\]])/g, "$1");
    }
  }

  return candidate.slice(start).replace(/,\s*([}\]])/g, "$1");
}

export async function generateAIJSON<T>(
  prompt: string,
  systemPrompt: string,
  options: AIGenerateOptions = {}
): Promise<T> {
  const jsonSystemPrompt = `${systemPrompt}

${AI_QUALITY_RULES}
${PROFESSIONAL_ANSWER_RULES}

ÖNEMLİ: Yanıtını YALNIZCA geçerli JSON formatında ver. Açıklama, markdown veya başka metin ekleme.
JSON dışında hiçbir şey yazma. Yanıt doğrudan JSON ile başlamalı ve JSON ile bitmeli.`;

  const response = await callGemini(
    [{ role: "user", content: prompt }],
    { ...options, systemPrompt: jsonSystemPrompt, responseMimeType: "application/json" }
  );

  const parsedText = cleanJSONText(response.text);

  try {
    return JSON.parse(parsedText) as T;
  } catch (error) {
    const repairPrompt = `Aşağıdaki çıktı geçersiz JSON. Yalnızca geçerli JSON döndür. Yapıyı, alanları ve anlamı koru. String içindeki kaçışsız tırnakları düzelt, eksik süslü parantezleri tamamla, markdown veya açıklama ekleme.

ÇIKTI:
\`\`\`
${response.text}
\`\`\``;

    const repairResponse = await callGemini(
      [{ role: "user", content: repairPrompt }],
      {
        ...options,
        systemPrompt: `${jsonSystemPrompt}\n\nJSON ONARIM MODU: Yalnızca geçerli JSON döndür.`,
        temperature: 0,
        responseMimeType: "application/json",
      }
    );

    return JSON.parse(cleanJSONText(repairResponse.text)) as T;
  }
}

/**
 * Streams raw text chunks from Gemini's streamGenerateContent SSE endpoint.
 * The caller accumulates chunks; the full text is valid JSON matching the
 * same format produced by generateAIJSON.
 */
export async function* streamAIJSONChunks(
  prompt: string,
  systemPrompt: string,
  options: AIGenerateOptions = {},
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = (process.env.AI_MODEL ?? DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
  const fallbackModel = FALLBACK_GEMINI_MODEL;
  const temperature = options.temperature ?? Number(process.env.AI_TEMPERATURE ?? "0.6");
  const maxOutputTokens = options.maxTokens ?? Number(process.env.AI_MAX_TOKENS ?? "3072");

  if (!apiKey || apiKey.includes("your-gemini-api-key")) {
    throw new Error("GEMINI_API_KEY ortam değişkeni tanımlı değil.");
  }

  const jsonSystemPrompt = `${systemPrompt}

${AI_QUALITY_RULES}
${PROFESSIONAL_ANSWER_RULES}

ÖNEMLİ: Yanıtını YALNIZCA geçerli JSON formatında ver. Açıklama, markdown veya başka metin ekleme.
JSON dışında hiçbir şey yazma. Yanıt doğrudan JSON ile başlamalı ve JSON ile bitmeli.`;

  const contents = [
    {
      role: "user",
      parts: [{ text: `[SYSTEM INSTRUCTION]\n${jsonSystemPrompt}\n[/SYSTEM INSTRUCTION]` }],
    },
    {
      role: "model",
      parts: [{ text: "Anlaşıldı. Talimatlarınıza uygun şekilde yardımcı olacağım." }],
    },
    { role: "user", parts: [{ text: prompt }] },
  ];

  async function openStream(targetModel: string) {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature, maxOutputTokens, responseMimeType: "application/json" },
        }),
        signal,
      },
    );
  }

  let response = await openStream(model);

  if (!response.ok && model !== fallbackModel) {
    const errText = await response.text().catch(() => "");
    if (/404|not found|model/i.test(errText)) {
      response = await openStream(fallbackModel);
    } else {
      throw new Error(`Gemini streaming hatası (${model}): ${response.status} - ${errText}`);
    }
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini streaming hatası (${model}): ${response.status} - ${errText}`);
  }

  if (!response.body) throw new Error("Gemini streaming yanıtı boş.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) yield text;
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
