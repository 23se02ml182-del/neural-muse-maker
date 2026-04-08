import { useState, useRef, useEffect, useMemo } from "react";

function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e;
}
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };
type AdvisorMode = "guided" | "freeform";

function getContextualChips(formData: LogoAdvisorChatProps["formData"]): string[] {
  const { name, description, style, colorPalette, industry, iconIdea } = formData;
  const chips: string[] = [];

  if (!name) {
    chips.push("Help me brainstorm a brand name");
  }
  if (!description && name) {
    chips.push(`Write a tagline for "${name}"`);
  }
  if (!industry) {
    chips.push("What industry fits my brand?");
  } else if (!style) {
    chips.push(`Best style for ${industry}?`);
  }
  if (!colorPalette) {
    chips.push(name ? `What colors suit "${name}"?` : "Suggest a color palette");
  } else if (!style) {
    chips.push("Suggest a style");
  }
  if (!iconIdea) {
    chips.push(industry ? `Icon ideas for ${industry}?` : "Help me pick an icon");
  }
  if (name && style && colorPalette && industry) {
    chips.push("Review my choices");
  }
  if (style && colorPalette) {
    chips.push("Does my style match my colors?");
  }

  // Always return 2-4 chips
  if (chips.length === 0) {
    chips.push("Any final tips?", "Review my choices");
  }
  return chips.slice(0, 4);
}

interface LogoAdvisorChatProps {
  formData: {
    name: string;
    description: string;
    style: string;
    colorPalette: string;
    industry: string;
    iconIdea: string;
  };
}

function SuggestionChips({ chips, onSelect }: { chips: string[]; onSelect: (chip: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-3">
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          {chip}
        </button>
      ))}
    </div>
  );
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

function buildStepByStepRoadmap(formData: LogoAdvisorChatProps["formData"]): string[] {
  const steps: string[] = [];
  if (!formData.name?.trim()) steps.push("1. Start with a clear brand name.");
  if (!formData.industry?.trim()) steps.push("2. Pick the best industry category.");
  if (!formData.style?.trim()) steps.push("3. Choose a logo style direction.");
  if (!formData.colorPalette?.trim()) steps.push("4. Select a color palette.");
  if (!formData.iconIdea?.trim()) steps.push("5. Decide on an icon idea.");
  steps.push("6. Review the choices and generate the logo.");
  return steps;
}

function getAdvisorNextAction(formData: LogoAdvisorChatProps["formData"]): { title: string; detail: string; question: string } {
  if (!formData.name?.trim()) {
    return {
      title: "Start with your brand name",
      detail: "The name gives me the anchor for the rest of the branding choices.",
      question: "What is your brand name?",
    };
  }
  if (!formData.industry?.trim()) {
    return {
      title: "Pick the industry",
      detail: "Industry helps me recommend the right visual language and tone.",
      question: "What industry fits your brand best?",
    };
  }
  if (!formData.style?.trim()) {
    return {
      title: "Choose the logo style",
      detail: "Style keeps the logo direction consistent before we refine colors and icons.",
      question: "Do you want minimalist, mascot, emblem, or something else?",
    };
  }
  if (!formData.colorPalette?.trim()) {
    return {
      title: "Select the color palette",
      detail: "Colors set the mood and help the logo feel premium and memorable.",
      question: "Which color palette should we use?",
    };
  }
  if (!formData.iconIdea?.trim()) {
    return {
      title: "Pick the icon idea",
      detail: "The icon story is what makes the logo feel specific and ownable.",
      question: "What icon idea do you want to explore?",
    };
  }

  return {
    title: "Everything is ready",
    detail: "You can review the current setup or move straight to generation.",
    question: "Want me to review your choices before generating the logo?",
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const REMOTE_ADVISOR_AVAILABLE = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// validate envs for chat/generation
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    "LogoAdvisorChat: missing SUPABASE env vars. Chat and logo generation will not work."
  );
}

const CHAT_URL = REMOTE_ADVISOR_AVAILABLE ? `${SUPABASE_URL}/functions/v1/logo-advisor` : "";

function buildLocalAdvisorReply(
  question: string,
  formData: LogoAdvisorChatProps["formData"],
  history: Msg[] = [],
  advisorMode: AdvisorMode = "guided"
): string {
  const normalized = normalizeAdvisorText(question);
  const name = formData.name?.trim() || "your brand";
  const description = formData.description?.trim() || "";
  const previousUserText = history
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
  const conversationHint = inferIndustryFromText(`${question} ${previousUserText} ${description} ${name}`);
  const industry = formData.industry?.trim() || conversationHint?.industry || "brand";
  const style = formData.style?.trim() || "minimalist";
  const color = formData.colorPalette?.trim() || "auto";
  const icon = formData.iconIdea?.trim() || "abstract symbol";
  const isDairy = /dairy/i.test(industry) || /dairy|milk|yogurt|cheese|butter/i.test(description);
  const nextAction = getAdvisorNextAction(formData);
  const answerFrame = (title: string, direct: string, reasoning: string, nextStep: string) => {
    if (advisorMode === "freeform") {
      return direct;
    }
    const lines = [title, direct, reasoning];
    if (advisorMode === "guided" && nextStep) {
      lines.push(`${nextStep}\nNext step: ${nextAction.question}`);
    }
    return lines.join("\n");
  };
  const stepRoadmap = buildStepByStepRoadmap(formData);
  const wantsStepByStep =
    normalized.includes("step by step") ||
    normalized.includes("step by step working") ||
    normalized.includes("step by step guide") ||
    normalized.includes("working step by step");

  if (wantsStepByStep) {
    const focus = `${nextAction.title}. ${nextAction.detail}`;

    return [
      "Step-by-step plan:",
      ...stepRoadmap,
      "",
      `Right now: ${focus}`,
      ...(advisorMode === "guided"
        ? ["If you want, I can walk you through one step at a time and wait after each choice."]
        : []),
    ].join("\n");
  }

  const industryQuestion =
    normalized.includes("what industry fits my brand") ||
    normalized.includes("suitable industry") ||
    normalized.includes("what industry set in my brand") ||
    normalized.includes("what industry should i use") ||
    normalized.includes("which industry");

  if (industryQuestion) {
    const suggested = conversationHint?.industry || (isDairy ? "Food & Beverage" : "Technology");
    const styleSuggestion = inferStyleForIndustry(suggested);
    return answerFrame(
      "Industry recommendation:",
      `${suggested} is the best fit for this brand.`,
      conversationHint?.reason || `That industry matches the brand cues and gives the logo a clearer market position.`,
      `Step 1: set the industry to ${suggested}. Step 2: use a ${styleSuggestion} logo style. Step 3: add colors and icon ideas after that.`
    );
  }

  const mentionedIndustries = extractMentionedIndustries(question);
  if (normalized.includes("best style for") && mentionedIndustries.length > 0) {
    return [
      "Style recommendation:",
      ...mentionedIndustries.map((item) => `- ${item}: ${inferStyleForIndustry(item)}`),
      ...(advisorMode === "guided"
        ? ["If you want one shared style across all of them, choose Minimalist or Geometric."]
        : []),
    ].join("\n");
  }

  if (normalized.includes("brand description") || normalized.includes("describe my brand") || normalized.includes("brand desc")) {
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

  if (normalized.includes("tagline")) {
    return [
      `For ${name}, keep the tagline short, clear, and memorable.`,
      `A strong formula is: benefit + tone + audience.`,
      `Example: "Fresh taste, timeless trust."`,
      ...(advisorMode === "guided" ? [`If you want, I can rewrite your current tagline into 10 premium options.`] : []),
    ].join("\n");
  }

  if (normalized.includes("color")) {
    return [
      `For ${industry}, use one hero color, one neutral, and one accent.`,
      `Your current palette setting is "${color}", so keep contrast high and avoid too many saturated tones.`,
      `Premium brands usually look best with fewer colors and more breathing room.`,
    ].join("\n");
  }

  if (normalized.includes("style")) {
    if (mentionedIndustries.length > 0) {
      return [
        "Style recommendation:",
        ...mentionedIndustries.map((item) => `- ${item}: ${inferStyleForIndustry(item)}`),
        ...(advisorMode === "guided"
          ? ["If you want one logo system that works across all of them, choose Minimalist or Geometric."]
          : []),
      ].join("\n");
    }

    const direct = isDairy
      ? "Best premium direction for now: mascot or emblem."
      : `Best premium direction for now: ${style}.`;
    const reasoning = isDairy
      ? "For dairy, a premium cow mascot, milk seal, or heritage crest usually feels warmer and more ownable than a tiny abstract icon."
      : "One clear style core keeps the system coherent and stops the generator from drifting into repeated-looking outputs.";
    const nextStep = isDairy
      ? "Make the icon larger, friendlier, and more premium so the logo reads instantly at small sizes."
      : "Then vary only silhouette, spacing, and typography hierarchy across variations.";
    return answerFrame("Style recommendation:", direct, reasoning, nextStep);
  }

  if (normalized.includes("icon")) {
    return [
      `For ${industry}, pick one icon story and stay consistent.`,
      isDairy
        ? "Good premium directions are: cow mascot, milk seal, dairy crest, or refined animal badge."
        : "Good premium directions are: monogram, badge, geometric mark, or refined mascot.",
      `Your current icon idea is "${icon}", which can work well if the silhouette stays simple.`,
    ].join("\n");
  }

  if (normalized.includes("review") || normalized.includes("choices")) {
    return answerFrame(
      `Here’s the cleanest branding direction for ${name}:`,
      `- Style: ${style}\n- Color: ${color}\n- Icon: ${icon}`,
      "Keep the logo simple, premium, and easy to recognize at small sizes.",
      isDairy
        ? "My recommendation: switch to a mascot or emblem, because dairy brands usually feel warmer and more premium with a cow or milk-seal symbol."
        : "My recommendation: keep the current style if you want a minimalist feel, but switch to an emblem or mascot if you want the logo to feel warmer and more memorable."
    );
  }

  return advisorMode === "guided"
    ? [
        `I can help with brand description, tagline writing, style direction, colors, icon ideas, and final prompt polishing.`,
        `Current setup: ${name} / ${industry} / ${style}.`,
        conversationHint
          ? `I think your brand fits best in ${conversationHint.industry}.`
          : `Try asking: "What industry fits my brand?" or "Suggest a style for Fashion, Travel, Architecture."`,
        "",
        `Next step: ${nextAction.question}`,
        nextAction.detail,
      ].join("\n")
    : "Ask one specific branding question and I’ll answer it directly.";
}

const LogoAdvisorChat = ({ formData }: LogoAdvisorChatProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [advisorMode, setAdvisorMode] = useState<AdvisorMode>("freeform");
  const bottomRef = useRef<HTMLDivElement>(null);
  const contextualChips = useMemo(() => getContextualChips(formData), [formData]);
  const nextAction = useMemo(() => getAdvisorNextAction(formData), [formData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessageWithText = async (text: string, allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    const pushAssistantMessage = (content: string) => {
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    };

    try {
      if (!REMOTE_ADVISOR_AVAILABLE) {
        pushAssistantMessage(buildLocalAdvisorReply(text, formData, allMessages, advisorMode));
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages, formData, advisorMode }),
      });

      if (!resp.ok) {
        pushAssistantMessage(buildLocalAdvisorReply(text, formData, allMessages, advisorMode));
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: unknown) {
      console.warn("Logo advisor remote request failed; using local guidance.", e);
      pushAssistantMessage(buildLocalAdvisorReply(text, formData, allMessages, advisorMode));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg glow-blue transition-transform hover:scale-105"
        aria-label="AI Advisor"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[360px] max-h-[500px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Logo Advisor</p>
                <p className="text-xs text-muted-foreground">AI branding assistant</p>
              </div>
            </div>
            <div className="flex items-center rounded-full border border-border bg-background p-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setAdvisorMode("freeform")}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  advisorMode === "freeform" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Answer Only
              </button>
              <button
                type="button"
                onClick={() => setAdvisorMode("guided")}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  advisorMode === "guided" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Guided
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[280px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Bot className="h-10 w-10 text-primary/40 mb-3" />
                <p className="text-sm font-medium text-foreground">Hi! I'm your Logo Advisor 👋</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Ask me anything about branding, styles, colors, or what to fill in next!
                </p>
                {advisorMode === "guided" && (
                  <>
                    <div className="mt-4 w-full rounded-2xl border border-border bg-secondary/30 p-4 text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                        Ask a question
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">{nextAction.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{nextAction.detail}</p>
                      <p className="mt-2 text-xs text-primary">{nextAction.question}</p>
                    </div>
                    <SuggestionChips
                      chips={contextualChips}
                      onSelect={(chip) => {
                        const userMsg: Msg = { role: "user", content: chip };
                        setMessages([userMsg]);
                        sendMessageWithText(chip, [userMsg]);
                      }}
                    />
                  </>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                {/* Show chips after the last assistant message when not loading */}
                {msg.role === "assistant" && i === messages.length - 1 && !isLoading && advisorMode === "guided" && (
                  <SuggestionChips
                    chips={contextualChips}
                    onSelect={(chip) => {
                      const userMsg: Msg = { role: "user", content: chip };
                      const allMsgs = [...messages, userMsg];
                      setMessages(allMsgs);
                      sendMessageWithText(chip, allMsgs);
                    }}
                  />
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-secondary px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text || isLoading) return;
              const userMsg: Msg = { role: "user", content: text };
              const allMsgs = [...messages, userMsg];
              setMessages(allMsgs);
              setInput("");
              sendMessageWithText(text, allMsgs);
            }}
            className="flex items-center gap-2 border-t border-border px-3 py-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for branding advice..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-8 w-8 shrink-0 rounded-full"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default LogoAdvisorChat;
