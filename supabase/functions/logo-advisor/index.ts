// @ts-nocheck
/// <reference lib="deno.ns" />
/// <reference lib="dom" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sseHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

// Default to resilient mode so the advisor still works without external credits.
// Set AI_ADVISOR_FREE_ONLY=false only if you explicitly want paid model calls.
const FREE_ONLY_MODE = (Deno.env.get("AI_ADVISOR_FREE_ONLY") ?? "true").trim().toLowerCase() !== "false";

function streamedAssistantMessage(message: string, code?: "402" | "429") {
  const payload = `data: ${JSON.stringify({ choices: [{ delta: { content: message } }] })}\n\ndata: [DONE]\n\n`;
  const extraHeaders = code ? { "x-ai-error-code": code } : {};
  return new Response(payload, {
    status: 200,
    headers: { ...sseHeaders, ...extraHeaders },
  });
}

type AdvisorMessage = { role: "user" | "assistant"; content: string };
type AdvisorMode = "guided" | "freeform";

function normalizeMessages(input: unknown): AdvisorMessage[] {
  if (!Array.isArray(input)) return [];
  const cleaned: AdvisorMessage[] = [];

  for (const raw of input) {
    const role = raw?.role === "assistant" ? "assistant" : raw?.role === "user" ? "user" : null;
    const content = typeof raw?.content === "string" ? raw.content.trim() : "";
    if (!role || !content) continue;
    cleaned.push({ role, content });
  }

  // Keep context short to reduce topic drift.
  return cleaned.slice(-12);
}

function getLastUserQuestion(messages: AdvisorMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const raw = messages[i].content.trim();
      const marker = "Answer this exact question first:";
      return raw.startsWith(marker) ? raw.slice(marker.length).trim() : raw;
    }
  }
  return "";
}

function buildFocusedConversation(messages: AdvisorMessage[]): AdvisorMessage[] {
  return messages;
}

function normalizeAdvisorText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[?.!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferIndustryFromText(value: string): { industry: string; reason: string } | null {
  const text = normalizeAdvisorText(value);
  if (!text) return null;

  if (/\b(water bottle|bottle|hydration|beverage|drink|juice|tea|coffee|water)\b/.test(text)) {
    return {
      industry: "Food & Beverage",
      reason: "Water bottles and drink products fit best under Food & Beverage.",
    };
  }
  if (/\b(fashion|clothing|apparel|wear|streetwear|boutique|style)\b/.test(text)) {
    return {
      industry: "Fashion",
      reason: "Clothing and style brands fit naturally under Fashion.",
    };
  }
  if (/\b(travel|tour|trip|hotel|resort|tourism|vacation)\b/.test(text)) {
    return {
      industry: "Travel",
      reason: "Travel-focused brands sit best in the Travel category.",
    };
  }
  if (/\b(architecture|architect|building|interior|construction)\b/.test(text)) {
    return {
      industry: "Architecture",
      reason: "Building and design-led brands fit best under Architecture.",
    };
  }
  if (/\b(tech|software|app|saas|ai|platform|digital)\b/.test(text)) {
    return {
      industry: "Technology",
      reason: "Software and digital products fit best under Technology.",
    };
  }
  if (/\b(health|fitness|gym|wellness|sports|athletic)\b/.test(text)) {
    return {
      industry: "Health & Fitness",
      reason: "Activity and wellness brands fit best under Health & Fitness.",
    };
  }
  if (/\b(dairy|milk|yogurt|cheese|fresh milk|butter)\b/.test(text)) {
    return {
      industry: "Food & Beverage",
      reason: "Dairy products are best grouped under Food & Beverage.",
    };
  }

  return null;
}

function inferStyleForIndustry(industry: string): string {
  const normalized = industry.toLowerCase();
  if (normalized.includes("fashion")) return "Minimalist or Wordmark";
  if (normalized.includes("travel")) return "Emblem or Abstract";
  if (normalized.includes("architecture")) return "Geometric or Minimalist";
  if (normalized.includes("food") || normalized.includes("beverage")) return "Minimalist or Emblem";
  if (normalized.includes("technology")) return "Geometric or Abstract";
  if (normalized.includes("health")) return "Minimalist or Mascot";
  return "Minimalist";
}

function extractMentionedIndustries(question: string): string[] {
  const text = normalizeAdvisorText(question);
  return [
    "Fashion",
    "Travel",
    "Architecture",
    "Technology",
    "Food & Beverage",
    "Health & Fitness",
    "Finance",
    "Education",
    "Real Estate",
    "Beauty & Cosmetics",
    "Logistics",
    "Agriculture",
    "Gaming",
    "Sports",
    "Automotive",
  ].filter((industry) => text.includes(industry.toLowerCase()));
}

function buildStepByStepRoadmap(formData: Record<string, string>): string[] {
  const steps: string[] = [];
  if (!formData?.name?.trim()) steps.push("1. Start with a clear brand name.");
  if (!formData?.industry?.trim()) steps.push("2. Pick the best industry category.");
  if (!formData?.style?.trim()) steps.push("3. Choose a logo style direction.");
  if (!formData?.colorPalette?.trim()) steps.push("4. Select a color palette.");
  if (!formData?.iconIdea?.trim()) steps.push("5. Decide on an icon idea.");
  steps.push("6. Review the choices and generate the logo.");
  return steps;
}

function getNextActionQuestion(formData: Record<string, string>): string {
  if (!formData?.name?.trim()) return "What is your brand name?";
  if (!formData?.industry?.trim()) return "What industry fits your brand best?";
  if (!formData?.style?.trim()) return "Do you want minimalist, mascot, emblem, or something else?";
  if (!formData?.colorPalette?.trim()) return "Which color palette should we use?";
  if (!formData?.iconIdea?.trim()) return "What icon idea do you want to explore?";
  return "Want me to review your choices before generating the logo?";
}

function localAdvisorReply(
  messages: Array<{ role: string; content: string }>,
  formData: Record<string, string>,
  advisorMode: AdvisorMode = "guided"
): string {
  const normalized = normalizeMessages(messages);
  const lastUserQuestion = getLastUserQuestion(normalized);
  const lastUserText = normalizeAdvisorText(lastUserQuestion);
  const previousUserText = normalized
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
  const name = formData?.name || "your brand";
  const description = formData?.description || "";
  const conversationHint = inferIndustryFromText(`${lastUserQuestion} ${previousUserText} ${description} ${name}`);
  const industry = formData?.industry || conversationHint?.industry || "brand";
  const style = formData?.style || "minimalist";
  const color = formData?.colorPalette || "auto";
  const icon = formData?.iconIdea || "abstract symbol";
  const isDairy = /dairy/i.test(industry) || /dairy|milk|yogurt|cheese|butter/i.test(description);
  const answerFrame = (title: string, direct: string, reasoning: string, nextStep: string) => {
    if (advisorMode === "freeform") {
      return direct;
    }
    const lines = [title, direct, reasoning];
    if (advisorMode === "guided" && nextStep) {
      lines.push(`${nextStep}\nNext step: ${getNextActionQuestion(formData)}`);
    }
    return lines.join("\n");
  };
  const stepRoadmap = buildStepByStepRoadmap(formData);
  const wantsStepByStep =
    lastUserText.includes("step by step") ||
    lastUserText.includes("step by step working") ||
    lastUserText.includes("step by step guide") ||
    lastUserText.includes("working step by step");

  if (wantsStepByStep) {
    const focus =
      !formData?.name?.trim() ? "Start with your brand name." :
      !formData?.industry?.trim() ? "Pick the industry next." :
      !formData?.style?.trim() ? "Choose the logo style next." :
      !formData?.colorPalette?.trim() ? "Choose the color palette next." :
      !formData?.iconIdea?.trim() ? "Choose the icon idea next." :
      "You’re ready to generate.";

    return [
      "Step-by-step plan:",
      ...stepRoadmap,
      "",
      `Right now: ${focus}`,
      "If you want, I can walk you through one step at a time and wait after each choice.",
    ].join("\n");
  }

  if (!lastUserQuestion) {
    return [
      "I’m your logo strategist.",
      "Ask me anything about brand description, tagline, style, icon direction, colors, or prompt rewriting.",
      "I’ll reply with a direct recommendation and a next step.",
    ].join("\n");
  }

  const industryQuestion =
    lastUserText.includes("what industry fits my brand") ||
    lastUserText.includes("suitable industry") ||
    lastUserText.includes("what industry set in my brand") ||
    lastUserText.includes("what industry should i use") ||
    lastUserText.includes("which industry");

  if (industryQuestion) {
    const suggested = conversationHint?.industry || (isDairy ? "Food & Beverage" : "Technology");
    const styleSuggestion = inferStyleForIndustry(suggested);
    return answerFrame(
      "Industry recommendation:",
      `${suggested} is the best fit for this brand.`,
      conversationHint?.reason || "That industry matches the brand cues and gives the logo a clearer market position.",
      `Step 1: set the industry to ${suggested}. Step 2: use a ${styleSuggestion} logo style. Step 3: add colors and icon ideas after that.`
    );
  }

  const mentionedIndustries = extractMentionedIndustries(lastUserQuestion);
  if (lastUserText.includes("best style for") && mentionedIndustries.length > 0) {
    return [
      "Style recommendation:",
      ...mentionedIndustries.map((item) => `- ${item}: ${inferStyleForIndustry(item)}`),
      ...(advisorMode === "guided"
        ? ["If you want one shared style across all of them, choose Minimalist or Geometric."]
        : []),
    ].join("\n");
  }

  if (lastUserText.includes("brand description") || lastUserText.includes("describe my brand") || lastUserText.includes("brand desc")) {
    const direct = isDairy
      ? `${name} is a premium dairy brand centered on farm-fresh purity, everyday trust, and a warm family feel.`
      : `${name} is a premium ${industry} brand built around freshness, trust, and consistent quality.`;
    const reasoning = description
      ? `Core story: ${description}`
      : isDairy
        ? "Core story: fresh milk, careful handling, and honest quality."
        : "Core story: fresh, clean, and easy to trust.";
    const nextStep = "Short version: premium, wholesome, and memorable at a glance.";
    return answerFrame(`Brand Description for ${name}:`, direct, reasoning, nextStep);
  }

  if (lastUserText.includes("name")) {
    return [
      `For ${industry}, the strongest naming directions are:`,
      `1) Benefit-led: "${name} Edge" / "${name} Flow"`,
      `2) Premium-led: "${name} Studio" / "${name} Atelier"`,
      `3) Bold-short: "${name}X" / "${name} One"`,
      `Pick one direction and I can generate 20 tailored names in that exact style.`,
    ].join("\n");
  }
  if (lastUserText.includes("color")) {
    return [
      `For ${industry}, use a 60/30/10 palette to look premium:`,
      `- 60% neutral base (white, graphite, deep navy)`,
      `- 30% brand tone (choose one hero color)`,
      `- 10% accent only for highlights`,
      `With your current "${color}" setting, keep contrast strong and avoid more than 2 saturated hues.`,
    ].join("\n");
  }
  if (lastUserText.includes("style")) {
    if (mentionedIndustries.length > 0) {
      return [
        "Style recommendation:",
        ...mentionedIndustries.map((item) => `- ${item}: ${inferStyleForIndustry(item)}`),
        "If you want one logo system that works across all of them, choose Minimalist or Geometric.",
      ].join("\n");
    }

    const direct = isDairy
      ? "Primary recommendation: mascot or emblem core with a premium cow or dairy seal as the symbol direction."
      : `Primary recommendation: ${style} core with ${icon} as the symbol direction.`;
    const reasoning = isDairy
      ? "For dairy, a friendly premium mascot or crest usually reads warmer, more trustworthy, and more ownable than a tiny abstract icon."
      : "A single style core keeps the logo system coherent and stops the generator from drifting into repeated-looking outputs.";
    const nextStep = isDairy
      ? "Then generate 4 variations with one axis change each: pose, badge shape, spacing, and color contrast."
      : "Then generate 4 variations with one axis change each: typography, icon geometry, spacing, and color contrast.";
    return answerFrame("Style recommendation:", direct, reasoning, nextStep);
  }
  if ((lastUserText.includes("mascot") && lastUserText.includes("minimal")) || (lastUserText.includes("minimal") && lastUserText.includes("brand"))) {
    return [
      `For a milk brand, mascot is usually stronger than minimalist.`,
      `Why: mascot feels friendly, trustworthy, and memorable for family/audience-focused products.`,
      `Use minimalist only if you want a very premium, corporate, or luxury dairy positioning.`,
    ].join("\n");
  }
  if (lastUserText.includes("icon")) {
    return [
      `For ${industry}, choose one icon story and stay consistent:`,
      isDairy
        ? `- Dairy/Freshness: premium cow mascot, milk seal, or heritage crest`
        : `- Growth/Speed: upward geometric motion`,
      isDairy
        ? `- Trust/Family: seal, badge, or friendly animal symbol`
        : `- Trust/Security: shield or stable symmetry`,
      isDairy
        ? `- Premium/Craft: luxury farm badge with a clean silhouette`
        : `- Premium/Craft: monogram or signature mark`,
      `Use one story only, then test at favicon size to ensure it still reads clearly.`,
    ].join("\n");
  }
  if (lastUserText.includes("tagline")) {
    return [
      `A premium tagline should be short and specific.`,
      `Formula: Outcome + Audience + Tone.`,
      `Example for ${name}: "Designed for fast-moving founders."`,
      ...(advisorMode === "guided"
        ? [`If you tell me your exact audience, I can generate 10 high-converting tagline options.`]
        : []),
    ].join("\n");
  }

  if (lastUserText.includes("review") || lastUserText.includes("my choices")) {
    return [
      "Here is your premium branding review:",
      `- Brand: ${name}`,
      `- Industry fit: ${industry}`,
      `- Style direction: ${style}`,
      `- Color direction: ${color}`,
      `- Icon story: ${icon}`,
      "Recommendation: keep one clear style + one icon story, then iterate typography and spacing only.",
      isDairy
        ? "If you want a warmer result for dairy, switch from minimalist to mascot or emblem and enlarge the cow or milk seal so it becomes the hero of the mark."
        : "If you want a warmer result, switch from minimalist to emblem or refined mascot.",
    ].join("\n");
  }

  if (lastUserText.includes("prompt") || lastUserText.includes("rewrite")) {
    return [
      "Use this premium logo prompt:",
      `Create a professional ${style} logo for "${name}" in ${industry}.`,
      `Use ${color} palette, keep composition clean, high contrast, vector style, no watermark, no mockup background.`,
      `Icon direction: ${icon}. Output should look unique, modern, and brand-ready.`,
    ].join("\n");
  }

  if (lastUserText.includes("who are you") || lastUserText.includes("what can you do")) {
    return [
      "I am your Logo Advisor.",
      "I can help with brand name ideas, style selection, color palette, icon direction, tagline writing, and final logo prompt improvement.",
      ...(advisorMode === "guided"
        ? ["Ask one specific logo question and I will answer it directly."]
        : ["Ask one specific logo question."]),
    ].join("\n");
  }

  if (lastUserQuestion) {
    return answerFrame(
      "Direct answer:",
      `- Brand: ${name}\n- Industry: ${industry}\n- Best immediate direction: ${style || "mascot"} with ${icon}`,
      "I’m using your current form settings to keep the answer grounded in your logo brief.",
      advisorMode === "guided"
        ? "If you want the strongest result, ask for one thing at a time: brand description, style, color, icon, tagline, prompt rewrite, or review."
        : ""
    );
  }

  return advisorMode === "guided"
    ? answerFrame(
        "I can help you like a full branding assistant.",
        `- Brand: ${name}\n- Industry: ${industry}\n- Style: ${style}`,
        "I’ll stay focused on your logo brief and avoid generic chatbot filler.",
        conversationHint
          ? `I think your brand fits best in ${conversationHint.industry}.`
          : `Ask me for one thing at a time: brand description, colors, icon, tagline, review, or prompt rewrite.\n\nStep-by-step shortcut:\n${stepRoadmap.join("\n")}`
      )
    : "Ask one specific branding question and I’ll answer it directly.";
}

function extractCloudflareText(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === "string") {
    const text = payload.trim();
    return text || null;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractCloudflareText(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const preferredKeys = ["response", "text", "output_text", "result", "content", "answer"];
    for (const key of preferredKeys) {
      if (key in obj) {
        const found = extractCloudflareText(obj[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

async function callCloudflareAdvisor(messages: Array<{ role: string; content: string }>, systemPrompt: string) {
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN") || Deno.env.get("CF_API_TOKEN");
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || Deno.env.get("CF_ACCOUNT_ID");
  const model = Deno.env.get("CLOUDFLARE_TEXT_MODEL") || "@cf/meta/llama-3.1-8b-instruct";

  if (!token || !accountId) return null;

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-10)],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    console.error("Cloudflare advisor error:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const content = extractCloudflareText(data?.result ?? data);
  if (!content) return null;
  return streamedAssistantMessage(content);
}

async function callOpenAIDirect(messages: Array<{role: string; content: string}>, systemPrompt: string) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return null;

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.1,
      max_tokens: 600,
      stream: false,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI direct API error:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  return streamedAssistantMessage(content);
}

async function callGeminiDirect(messages: Array<{role: string; content: string}>, systemPrompt: string) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) return null;

  const geminiMessages = messages.map((m: {role: string; content: string}) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!response.ok) {
    console.error("Gemini direct API error:", response.status, await response.text());
    return null;
  }

  // Transform Google's SSE format to OpenAI-compatible SSE
  const reader = response.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                const sseChunk = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
                controller.enqueue(encoder.encode(sseChunk));
              }
            } catch { /* skip malformed */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e: any) {
        console.error("Stream transform error:", e);
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, formData, advisorMode } = await req.json();
    const normalizedMessages = normalizeMessages(messages);
    const focusedMessages = buildFocusedConversation(normalizedMessages);
    const lastUserQuestion = getLastUserQuestion(normalizedMessages);
    const safeAdvisorMode: AdvisorMode = advisorMode === "freeform" ? "freeform" : "guided";

    const systemPrompt = `You are a premium logo and branding advisor.

RULE 1: First answer the user's latest question directly and specifically.
RULE 2: Do not change topic unless the user asks a new topic.
RULE 3: If context is missing, ask one short clarification question instead of guessing.
RULE 4: Be clear, practical, and specific. Use concise bullets when useful.
RULE 5: Keep a supportive, expert tone (like a strong product design consultant).
    RULE 6: When the user asks for ideas, provide options with short reasoning.
    RULE 7: Avoid fluff; prioritize actionable output that improves logo quality.
    RULE 8: Match the user's language style (English/Hinglish) when possible.
RULE 9: If the user asks for brand description, tagline, review, or style advice, return a ready-to-use answer with no generic apology or self-reference.
RULE 10: When possible, format advice as: Direct answer, Why it works, Recommendation, Next step. Keep it concise but useful.
    RULE 11: If the user asks for "step by step" guidance, answer in numbered steps and tell them the next action first.
RULE 12: Advisor mode is "${safeAdvisorMode}". If guided, end with the next best action. If freeform, answer directly without forcing a follow-up.

Latest user question to answer now:
"${lastUserQuestion || "(not provided)"}"

Context (use only when relevant to the user's question):
- Brand Name: ${formData?.name || "(not set)"}
- Description: ${formData?.description || "(not set)"}
- Style: ${formData?.style || "(not chosen)"}
- Color Palette: ${formData?.colorPalette || "(not chosen)"}
- Industry: ${formData?.industry || "(not chosen)"}
- Icon Idea: ${formData?.iconIdea || "(not chosen)"}

Available options for reference (Recommend these styles):
- Styles: Mascot Character, Minimalist / Clean, Wordmark / Logotype, Lettermark / Monogram, Emblem / Badge, Abstract Mark, Vintage / Retro, Geometric, 3D / Dimensional, Hand-drawn / Artisan
- Style IDs: mascot, minimalist, wordmark, lettermark, emblem, abstract, vintage, geometric, 3d, handdrawn
- Industries: Technology, Food & Beverage, Health & Fitness, Fashion, Education, Finance, Entertainment, Travel, Real Estate, Music, Sports, Photography, Automotive, Gaming, Architecture, Legal, Agriculture, Beauty & Cosmetics, Logistics, Non-Profit
- Icon Ideas: Abstract shapes, Letter-based, Mascot character, Nature element, Animal, Shield/Badge, Circuit/Tech, Crown/Luxury, Globe/World, Lightning bolt, Leaf/Eco, Compass/Direction`;

    if (FREE_ONLY_MODE) {
      const cfReply = await callCloudflareAdvisor(focusedMessages, systemPrompt);
      if (cfReply) return cfReply;
      return streamedAssistantMessage(localAdvisorReply(focusedMessages ?? [], formData ?? {}, safeAdvisorMode));
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Try Lovable gateway first
    if (LOVABLE_API_KEY) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash",
          messages: [{ role: "system", content: systemPrompt }, ...focusedMessages],
          stream: true,
          temperature: 0.1,
        }),
      });

      if (response.status === 429) {
        const fallback = await callCloudflareAdvisor(focusedMessages, systemPrompt);
        if (fallback) return fallback;
        return streamedAssistantMessage(localAdvisorReply(focusedMessages ?? [], formData ?? {}, safeAdvisorMode), "429");
      }
      if (response.status === 402) {
        console.log("Lovable credits exhausted; falling back to Cloudflare or local advisor.");
        const fallback = await callCloudflareAdvisor(focusedMessages, systemPrompt);
        if (fallback) return fallback;
        return streamedAssistantMessage(localAdvisorReply(focusedMessages ?? [], formData ?? {}, safeAdvisorMode), "402");
      }
    if (response.ok) {
      return new Response(response.body, { headers: sseHeaders });
    }

      // Non-402/429 error — try Cloudflare fallback first.
      console.error("Lovable gateway error:", response.status);
    }

    // No LOVABLE_API_KEY or gateway failed — try Cloudflare Workers AI first.
    const fallback = await callCloudflareAdvisor(focusedMessages, systemPrompt);
    if (fallback) return fallback;

    // Optional direct OpenAI fallback if configured.
    const openAIFallback = await callOpenAIDirect(focusedMessages, systemPrompt);
    if (openAIFallback) return openAIFallback;

    return streamedAssistantMessage(localAdvisorReply(focusedMessages ?? [], formData ?? {}, safeAdvisorMode));
  } catch (e: any) {
    console.error("logo-advisor error:", e);
    return streamedAssistantMessage(localAdvisorReply([], formData ?? {}, "guided"));
  }
});
