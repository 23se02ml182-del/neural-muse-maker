import { useState, useEffect, useCallback } from "react";

function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e;
}
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Download, Sparkles, Save, Heart, Check, Cpu, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import LogoAdvisorChat from "@/components/LogoAdvisorChat";
import { generateVariations } from "@/lib/logo-engine";
import type { LogoStyle, GeneratedLogo as EngineGeneratedLogo } from "@/lib/logo-engine/types";
import { logoStyles, colorPalettes, industries, iconIdeas } from "@/lib/logo-options";
import { LogoSVGRenderer } from "@/components/LogoSVGRenderer";
import { exportToPNG } from "@/lib/logo-engine";
import { useAuth } from "@/hooks/useAuth";
import { useLogoPreferences } from "@/hooks/useLogoPreferences";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateHFLogo, isHFConfigured } from "@/lib/hf-image-generator";
const LOGOS_PER_STYLE = 3;
const MAX_STYLE_SELECTION = 4;

type GeneratedLogo = {
  imageUrl: string;
  styleId: string;
  styleLabel: string;
  variationIndex: number;
  globalIndex: number;
  engineLogo?: EngineGeneratedLogo;
};

const getStyleLabel = (styleId: string) =>
  logoStyles.find((style) => style.id === styleId)?.label ?? styleId;

const mapUiStyleToEngineStyle = (styleId: string): LogoStyle => {
  const normalized = styleId.toLowerCase().trim();
  if (normalized === "auto" || !normalized) return "emblem";
  if (normalized === "cartoon") return "mascot";
  if (normalized === "modern" || normalized === "minimalist" || normalized === "flat") return "minimalist";
  if (normalized === "wordmark" || normalized === "lineart") return "wordmark";
  if (normalized === "lettermark") return "lettermark";
  if (normalized === "emblem") return "emblem";
  if (normalized === "abstract" || normalized === "futuristic" || normalized === "gradient") return "abstract";
  if (normalized === "vintage") return "vintage";
  if (normalized === "3d") return "3d";
  if (normalized === "handdrawn" || normalized === "watercolor") return "handdrawn";
  if (normalized === "geometric") return "geometric";
  return "emblem";
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const buildVariationSeed = (...parts: Array<string | number | undefined>): number => {
  const seedSource = parts
    .map((part) => (typeof part === "number" ? String(part) : (part || "").trim()))
    .join("|");
  const seed = hashString(seedSource);
  return seed === 0 ? 1 : seed;
};

const CreateLogo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences } = useLogoPreferences();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLogos, setGeneratedLogos] = useState<GeneratedLogo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [generationMode, setGenerationMode] = useState<"svg" | "ai">("svg");
  const [aiProgress, setAiProgress] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: searchParams.get("name") || "",
    description: "",
    style: preferences.defaultStyle === "auto" ? "" : (preferences.defaultStyle || ""),
    colorPalette: preferences.defaultPalette || "",
    industry: "",
    iconIdea: "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      style: prev.style || (preferences.defaultStyle === "auto" ? "" : (preferences.defaultStyle || "")),
      colorPalette: prev.colorPalette || preferences.defaultPalette || "",
    }));
  }, [preferences.defaultStyle, preferences.defaultPalette]);

  const totalSteps = 4;
  const selectedPalette = colorPalettes.find((palette) => palette.id === formData.colorPalette) || null;
  const primaryIndustry =
    formData.industry
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)[0] || "General";
  const selectedIndustryCount = (formData.industry || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean).length;
  const selectedIconIdeaCount = (formData.iconIdea || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean).length;

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSelection = (field: "industry" | "iconIdea", item: string, max: number) => {
    setFormData((prev) => {
      const currentStr = (prev[field] as string) || "";
      let arr = currentStr.split(",").map(s => s.trim()).filter(Boolean);
      
      if (arr.includes(item)) {
        arr = arr.filter(x => x !== item);
      } else {
        if (arr.length >= max) {
          toast.error(`Maximum ${max} allowed`);
          return prev;
        }
        arr.push(item);
      }
      return { ...prev, [field]: arr.join(", ") };
    });
  };

  const stylesToGenerate = selectedStyles.length > 0 ? selectedStyles : (formData.style ? [formData.style] : ["emblem"]);
  const totalLogos = stylesToGenerate.length * LOGOS_PER_STYLE;
  const selectedLogo = generatedLogos[selectedIndex] || null;
  const selectedImage = selectedLogo?.imageUrl || null;

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setAiProgress("");
    try {
      const styles = selectedStyles.length > 0 ? selectedStyles : (formData.style ? [formData.style] : ["emblem"]);
      const allLogos: GeneratedLogo[] = [];
      const normalizedDescription = formData.description.trim().replace(/\s+/g, " ").slice(0, 280);
      const paletteColors = (() => {
        if (!formData.colorPalette || formData.colorPalette === "auto") return undefined;
        const matched = colorPalettes.find((palette) => palette.id === formData.colorPalette);
        if (matched?.colors?.length) return matched.colors;
        return [formData.colorPalette];
      })();
      const tagline = (() => {
        if (!normalizedDescription) return undefined;
        const firstSentence = normalizedDescription.split(/[.!?]/)[0]?.trim() ?? "";
        if (!firstSentence) return undefined;
        const words = firstSentence.split(/\s+/).filter(Boolean);
        const stopWords = new Set(["the", "and", "for", "with", "your", "our", "you", "are", "from", "that", "this", "of", "to", "in", "a", "an"]);
        const filtered = words.filter((word) => !stopWords.has(word.toLowerCase()));
        const source = filtered.length >= 3 ? filtered : words;
        return source.slice(0, 6).join(" ");
      })();

      // ─── AI MODE (Hugging Face) ────────────────────────────
      if (generationMode === "ai") {
        const totalAiLogos = styles.length * LOGOS_PER_STYLE;
        let aiCount = 0;
        for (const styleId of styles) {
          const styleLabel = getStyleLabel(styleId);
          for (let v = 0; v < LOGOS_PER_STYLE; v++) {
            aiCount++;
            setAiProgress(`Generating AI logo ${aiCount}/${totalAiLogos} (${styleLabel})…`);
            try {
              const result = await generateHFLogo({
                businessName: formData.name,
                industry: primaryIndustry,
                style: styleId,
                tagline,
                colors: paletteColors,
                mood: formData.description || undefined,
                iconIdea: formData.iconIdea || undefined,
                description: normalizedDescription || undefined,
              }, (msg) => setAiProgress(`[${aiCount}/${totalAiLogos}] ${msg}`));
              allLogos.push({
                imageUrl: result.imageUrl,
                styleId,
                styleLabel,
                variationIndex: v,
                globalIndex: allLogos.length,
              });
            } catch (err) {
              console.warn(`AI logo ${aiCount} failed:`, err);
              if (allLogos.length === 0 && aiCount === 1) throw err;
            }
          }
        }
      } else {
        // ─── SVG ENGINE MODE ───────────────────────────────────
        for (const styleId of styles) {
          const styleLabel = getStyleLabel(styleId);
          const engineStyle = mapUiStyleToEngineStyle(styleId);
          const brandNotes = [
            `Create a premium ${styleLabel.toLowerCase()} logo.`,
            "Use a polished, marketplace-quality look.",
            "Avoid generic circle, cube, or four-square placeholder marks.",
            "Prefer strong emblem, badge, crest, or premium brand-symbol compositions.",
            formData.iconIdea ? `Icon idea: ${formData.iconIdea}.` : "",
            normalizedDescription ? `Brand description: ${normalizedDescription}.` : "",
          ].filter(Boolean).join(" ");

          const styleVariations = await generateVariations({
            businessName: formData.name,
            tagline,
            description: normalizedDescription || undefined,
            industry: primaryIndustry,
            style: engineStyle,
            colors: paletteColors,
            iconIdea: formData.iconIdea || undefined,
          }, LOGOS_PER_STYLE);

          styleVariations.forEach((result, variationIndex) => {
            const globalIndex = allLogos.length;
            allLogos.push({
              imageUrl: result.dataUrl,
              styleId,
              styleLabel,
              variationIndex,
              globalIndex,
              engineLogo: result,
            });
          });
        }
      }

      if (allLogos.length === 0) {
        throw new Error("Failed to generate logos. Please try again.");
      }

      setGeneratedLogos(allLogos);
      setSelectedIndex(0);
      setStep(5);
      toast.success(`${allLogos.length} logo${allLogos.length > 1 ? "s" : ""} generated!`);
    } catch (error: unknown) {
      console.error("Logo generation error:", error);
      if (isErrorWithMessage(error)) toast.error(error.message || "Failed to generate logo");
      else toast.error("Failed to generate logo");
    } finally {
      setIsGenerating(false);
      setAiProgress("");
    }
  }, [formData, selectedStyles, primaryIndustry, generationMode]);

  const handleGenerateClick = () => {
    handleGenerate();
  };

  // if the page was loaded after a login redirect with ?generate=1, start generation once the user object is available
  // restore saved data (if any) when the component mounts
  useEffect(() => {
    const stored = sessionStorage.getItem("pendingLogo");
    if (stored) {
      try {
        const { formData: f, step: s } = JSON.parse(stored);
        if (f) setFormData(f);
        if (s) setStep(s);
      } catch (err) {
        console.warn("failed to restore pending logo state", err);
      }
      sessionStorage.removeItem("pendingLogo");
    }
  }, []);

  useEffect(() => {
    const shouldGenerate = searchParams.get("generate") === "1";
    if (shouldGenerate && user && !autoTriggered) {
      setAutoTriggered(true);
      // remove the query parameter so refresh doesn't retrigger
      navigate("/create", { replace: true });
      setShowWelcome(true);
      setTimeout(() => {
        setShowWelcome(false);
        handleGenerate();
      }, 2200);
    }
  }, [user, searchParams, autoTriggered, navigate, handleGenerate]);

  const saveImagesToCollection = async (imagesToSave: string[]) => {
    if (!user) {
      toast.error("Please sign in to save logos");
      navigate("/auth");
      return;
    }

    const normalized = Array.from(
      new Set(imagesToSave.map((image) => image.trim()).filter(Boolean))
    );
    if (normalized.length === 0) {
      toast.error("No logo selected to save");
      return;
    }

    setIsSaving(true);
    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("saved_logos")
        .select("image_data")
        .eq("user_id", user.id);
      if (existingError) throw existingError;

      const existing = new Set((existingRows || []).map((row) => row.image_data));
      const inserts = normalized
        .filter((img) => !existing.has(img))
        .map((img) => ({
          user_id: user.id,
          name: formData.name,
          description: formData.description || null,
          style: formData.style || null,
          color_palette: formData.colorPalette || null,
          industry: formData.industry || null,
          icon_idea: formData.iconIdea || null,
          image_data: img,
        }));

      if (inserts.length === 0) {
        toast.info("These logos are already in your Saved folder.");
        return;
      }

      const { error } = await supabase.from("saved_logos").insert(inserts);
      if (error) throw error;

      const skipped = normalized.length - inserts.length;
      if (skipped > 0) {
        toast.success(`Saved ${inserts.length} logo(s). ${skipped} already existed.`);
      } else {
        toast.success(`Saved ${inserts.length} logo(s) to your Saved folder.`);
      }
    } catch (error: unknown) {
      if (isErrorWithMessage(error)) toast.error(error.message || "Failed to save logo(s)");
      else toast.error("Failed to save logo(s)");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (imageToSave?: string) => {
    const image = imageToSave || selectedImage;
    if (!image) return;
    await saveImagesToCollection([image]);
  };

  const handleDownload = async (imageToDownload?: string) => {
    const lg = generatedLogos[selectedIndex];
    const image = imageToDownload || selectedImage;
    if (!image) return;
    
    let downloadUrl = image;
    let ext = "png";
    
    if (lg?.engineLogo) {
      try {
        downloadUrl = await exportToPNG(lg.engineLogo.dataUrl, 1024);
      } catch (e) {
        console.error("Export PNG failed, falling back to original url");
      }
    }
    
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${formData.name}-logo.${ext}`.replace(/\s+/g, '-').toLowerCase();
    link.click();
    
    if (preferences.autoSaveDownloads && user) {
      void saveImagesToCollection([image]);
    }
  };

  const handleSaveAll = async () => {
    await saveImagesToCollection(generatedLogos.map((logo) => logo.imageUrl));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.name.trim().length > 0;
      case 2: return selectedStyles.length > 0 || formData.style.length > 0;
      case 3: return formData.colorPalette.length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const toggleStyle = (styleId: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(styleId)) return prev.filter((s) => s !== styleId);
      if (prev.length >= MAX_STYLE_SELECTION) {
        toast.error(`Maximum ${MAX_STYLE_SELECTION} styles allowed`);
        return prev;
      }
      return [...prev, styleId];
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Welcome animation overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-4 animate-scale-in">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center animate-[pulse_1s_ease-in-out_infinite]">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -inset-3 rounded-full border-2 border-primary/30 animate-[ping_1.5s_ease-out_infinite]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
              Welcome back! ✨
            </h2>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: "0.6s", animationFillMode: "both" }}>
              Preparing your logo generator…
            </p>
            <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary glow-blue"
                style={{
                  animation: "welcomeProgress 1.8s ease-in-out forwards",
                  animationDelay: "0.4s",
                  width: "0%",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <main
        className={`container mx-auto ${preferences.compactMode ? "px-4 pt-24 pb-12" : "px-6 pt-28 pb-16"}`}
      >
        {step <= totalSteps && (
          <>
            <div className="mx-auto mb-10 max-w-2xl">
              <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>Step {step} of {totalSteps}</span>
                <span>{Math.round((step / totalSteps) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 glow-blue"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            <div className="mx-auto max-w-2xl">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-3xl font-bold text-foreground">
                      What's your <span className="text-gradient">brand name</span>?
                    </h2>
                    <p className="mt-2 text-muted-foreground">Tell us about your brand</p>
                  </div>
                  <div className="glass rounded-2xl p-8 space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Brand Name</label>
                      <Input
                        placeholder="e.g. TechFlow, FoodRush..."
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className="h-14 rounded-xl border-border/50 bg-secondary/50 text-base"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Brand Description (optional)</label>
                      <Textarea
                        placeholder="Describe your brand, its purpose, and target audience..."
                        value={formData.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        className="min-h-[120px] rounded-xl border-border/50 bg-secondary/50 text-base"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-3xl font-bold text-foreground">
                      Choose <span className="text-gradient">logo styles</span>
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      Select 1 to 4 style directions. Each selected style generates its own set of 3 logos.
                      {selectedStyles.length > 0 && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {selectedStyles.length}/{MAX_STYLE_SELECTION} selected
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      1 style = 3 logos, 2 styles = 6 logos, 3 styles = 9 logos, 4 styles = 12 logos.
                    </p>
                  </div>
                  <div className={`grid grid-cols-2 ${preferences.compactMode ? "gap-3 sm:grid-cols-4" : "gap-4 sm:grid-cols-4"}`}>
                    {logoStyles.map((style) => {
                      const isSelected = selectedStyles.includes(style.id);
                      return (
                        <button
                          key={style.id}
                          onClick={() => toggleStyle(style.id)}
                          className={`glass rounded-2xl p-6 text-center transition-all duration-200 hover:border-primary/50 relative h-[120px] flex flex-col items-center justify-center ${
                            isSelected ? "border-primary shadow-md bg-primary/5" : ""
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          <span className="mb-2 block text-3xl">{style.icon}</span>
                          <span className="text-sm font-medium text-foreground">{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-foreground">Or type your own style</label>
                    <Input
                      placeholder="e.g. Retro pixel art, Neon glow..."
                      value={formData.style}
                      onChange={(e) => updateField("style", e.target.value)}
                      className="rounded-xl border-border/50 bg-secondary/50"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-3xl font-bold text-foreground">
                      Pick your <span className="text-gradient">colors</span>
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      Choose one palette. This will be applied to all generated logos.
                    </p>
                    {selectedPalette ? (
                      <p className="mt-2 text-sm font-medium text-primary">
                        Selected: {selectedPalette.label}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-amber-500">
                        Please select a color palette to continue.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {colorPalettes.map((palette) => {
                      const isSelected = formData.colorPalette === palette.id;
                      return (
                        <button
                          key={palette.id}
                          onClick={() => updateField("colorPalette", palette.id)}
                          className={`relative glass rounded-2xl p-5 text-center transition-all duration-200 hover:border-primary/50 h-[120px] flex flex-col items-center justify-center ${
                            isSelected ? "border-primary shadow-md bg-primary/5 ring-2 ring-primary/30" : ""
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              <Check className="h-3 w-3" />
                              Selected
                            </div>
                          )}
                          <div className="mb-3 flex justify-center gap-1">
                            {palette.colors.map((color) => (
                              <div
                                key={color}
                                className="h-8 w-8 rounded-full border border-border/30"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-foreground">{palette.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="font-display text-3xl font-bold text-foreground">
                      Final <span className="text-gradient">details</span>
                    </h2>
                    <p className="mt-2 text-muted-foreground">Help us create the perfect logo</p>
                  </div>
                  <div className="glass rounded-2xl p-8 space-y-8">
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Chosen Color Palette</p>
                        <div className="flex items-center gap-3">
                          {selectedPalette ? (
                            <span className="text-sm font-semibold text-foreground">{selectedPalette.label}</span>
                          ) : (
                            <span className="text-sm font-semibold text-amber-500">Not selected</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Change palette
                          </button>
                        </div>
                      </div>
                      {selectedPalette ? (
                        <div className="flex gap-2">
                          {selectedPalette.colors.map((color) => (
                            <div
                              key={color}
                              className="h-7 w-7 rounded-full border border-border/40"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Go back to Step 3 and choose a palette for better quality results.
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <label className="block text-sm font-medium text-foreground">Industry</label>
                        <span className="text-xs font-medium text-muted-foreground">
                          {selectedIndustryCount}/4 selected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {industries.map((ind) => {
                          const isSelected = (formData.industry || "").split(",").map(s => s.trim()).includes(ind);
                          return (
                            <button
                              key={ind}
                              onClick={() => toggleSelection("industry", ind, 4)}
                              className={`rounded-full border px-4 py-2 text-sm transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/20 text-foreground"
                                  : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {ind}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3">
                        <Input
                          placeholder="Or type your own (comma-separated)..."
                          value={(() => {
                            const arr = (formData.industry || "").split(",").map(s => s.trim()).filter(Boolean);
                            const custom = arr.filter(x => !industries.includes(x));
                            return custom.join(", ");
                          })()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const arr = (formData.industry || "").split(",").map(s => s.trim()).filter(Boolean);
                            const predefined = arr.filter(x => industries.includes(x));
                            if (val.trim()) {
                              updateField("industry", [...predefined, val].join(", "));
                            } else {
                              updateField("industry", predefined.join(", "));
                            }
                          }}
                          className="rounded-xl border-border/50 bg-secondary/50"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <label className="block text-sm font-medium text-foreground">Icon Style (optional)</label>
                        <span className="text-xs font-medium text-muted-foreground">
                          {selectedIconIdeaCount}/4 selected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {iconIdeas.map((idea) => {
                          const isSelected = (formData.iconIdea || "").split(",").map(s => s.trim()).includes(idea);
                          return (
                            <button
                              key={idea}
                              onClick={() => toggleSelection("iconIdea", idea, 4)}
                              className={`rounded-full border px-4 py-2 text-sm transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/20 text-foreground"
                                  : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {idea}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3">
                        <Input
                          placeholder="Or type your own (comma-separated)..."
                          value={(() => {
                            const arr = (formData.iconIdea || "").split(",").map(s => s.trim()).filter(Boolean);
                            const custom = arr.filter(x => !iconIdeas.includes(x));
                            return custom.join(", ");
                          })()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const arr = (formData.iconIdea || "").split(",").map(s => s.trim()).filter(Boolean);
                            const predefined = arr.filter(x => iconIdeas.includes(x));
                            if (val.trim()) {
                              updateField("iconIdea", [...predefined, val].join(", "));
                            } else {
                              updateField("iconIdea", predefined.join(", "));
                            }
                          }}
                          className="rounded-xl border-border/50 bg-secondary/50"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm font-medium text-foreground">
                        Output Count:{" "}
                        <span className="text-primary">
                          {stylesToGenerate.length} style{stylesToGenerate.length > 1 ? "s" : ""} x {LOGOS_PER_STYLE}
                        </span>{" "}
                        = <span className="font-semibold">{totalLogos} logos</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This count is fixed for premium quality consistency.
                      </p>
                    </div>

                    {/* ─── Generation Mode Toggle ─── */}
                    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary/80">Generation Engine</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setGenerationMode("svg")}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                            generationMode === "svg"
                              ? "border-primary bg-primary/10 shadow-md"
                              : "border-border/50 bg-secondary/20 hover:border-primary/30"
                          }`}
                        >
                          <Palette className={`h-5 w-5 ${generationMode === "svg" ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="text-left">
                            <p className={`text-sm font-bold ${generationMode === "svg" ? "text-primary" : "text-foreground"}`}>SVG Engine</p>
                            <p className="text-[10px] text-muted-foreground">Instant • Offline • Vector</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isHFConfigured()) {
                              toast.error("Set VITE_HF_TOKEN in .env first. Get a free token at huggingface.co/settings/tokens");
                              return;
                            }
                            setGenerationMode("ai");
                          }}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                            generationMode === "ai"
                              ? "border-purple-500 bg-purple-500/10 shadow-md"
                              : "border-border/50 bg-secondary/20 hover:border-purple-500/30"
                          }`}
                        >
                          <Cpu className={`h-5 w-5 ${generationMode === "ai" ? "text-purple-400" : "text-muted-foreground"}`} />
                          <div className="text-left">
                            <p className={`text-sm font-bold ${generationMode === "ai" ? "text-purple-400" : "text-foreground"}`}>AI Generate</p>
                            <p className="text-[10px] text-muted-foreground">Hugging Face • HD • Unique</p>
                          </div>
                        </button>
                      </div>
                      {generationMode === "ai" && (
                        <p className="mt-2 text-[10px] text-purple-400/70">
                          ⚡ AI mode uses Hugging Face SDXL. Each logo takes ~15-30s. Results are photorealistic AI art.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => step === 1 ? navigate("/") : setStep(step - 1)}
                  className="gap-2 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                {step < totalSteps ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className="gap-2 rounded-xl glow-blue"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateClick}
                    disabled={isGenerating}
                    className="gap-2 rounded-xl glow-blue"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : generationMode === "ai" ? <Cpu className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {isGenerating && aiProgress ? aiProgress : generationMode === "ai" ? `AI Generate ${totalLogos > 1 ? `${totalLogos} Logos` : "Logo"}` : `Generate ${totalLogos > 1 ? `${totalLogos} Logos` : "Logo"}`}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Results step */}
        {step === 5 && (
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-foreground">
                Your <span className="text-gradient">{generatedLogos.length > 1 ? "Logos are" : "Logo is"}</span> Ready!
              </h2>
              <p className="mt-2 text-muted-foreground">
                {generatedLogos.length > 1
                  ? "Click a variation to select it, then save or download"
                  : "Here's your AI-generated logo"}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-primary/80">
                Style-Aware Mode Active
              </p>
            </div>

            {/* Variations grouped by style */}
            {generatedLogos.length > 0 ? (
              <div className="mt-10 space-y-10">
                {stylesToGenerate.map((styleId, stylePosition) => {
                  const styleItems = generatedLogos.filter((logo) => logo.styleId === styleId);
                  const styleLabel = getStyleLabel(styleId);

                  if (styleItems.length === 0) return null;

                  return (
                    <section
                      key={styleId}
                      className={`rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-secondary/20 ${
                        preferences.compactMode ? "p-4 sm:p-5" : "p-5 sm:p-6"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-sm">
                            {stylePosition + 1}
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              Style set
                            </p>
                            <h3 className="mt-1 font-display text-2xl font-bold text-foreground">
                              {styleLabel}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Three logo variations for this direction.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                            Style {stylePosition + 1}
                          </span>
                          <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {styleItems.length}/{LOGOS_PER_STYLE} logos
                          </span>
                        </div>
                      </div>

                      <div className={`mt-5 grid ${preferences.compactMode ? "gap-3 sm:grid-cols-2 lg:grid-cols-3" : "gap-5 sm:grid-cols-2 lg:grid-cols-3"}`}>
                        {styleItems.map((logo) => (
                          <button
                            key={`${logo.styleId}-${logo.variationIndex}-${logo.globalIndex}`}
                            onClick={() => setSelectedIndex(logo.globalIndex)}
                            className={`glass rounded-2xl overflow-hidden transition-all duration-200 ${
                              selectedIndex === logo.globalIndex
                                ? "border-primary glow-blue ring-2 ring-primary/30"
                                : "hover:border-primary/50"
                            }`}
                          >
                            <div className="relative aspect-square overflow-hidden bg-secondary/20 p-3">
                              <div className="absolute right-3 top-3 z-10 rounded-full bg-black/20 p-1.5 backdrop-blur">
                                <Heart className="h-4 w-4 text-white" />
                              </div>
                              {selectedIndex === logo.globalIndex && (
                                <div className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                                  <Check className="h-4 w-4 text-primary-foreground" />
                                </div>
                              )}
                              {logo.engineLogo ? (
                                <div className="h-full w-full rounded-xl border border-border/40 transition-transform duration-300 [transform:scale(1.08)] bg-secondary/10">
                                  <LogoSVGRenderer logo={logo.engineLogo} />
                                </div>
                              ) : (
                                <img
                                  src={logo.imageUrl}
                                  alt={`${formData.name} ${styleLabel} variation ${logo.variationIndex + 1}`}
                                  className="h-full w-full rounded-xl border border-border/40 object-contain transition-transform duration-300 [transform:scale(1.08)]"
                                />
                              )}
                            </div>
                            <div className="p-3 text-left">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Variation {logo.variationIndex + 1}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="mt-10 glass rounded-2xl p-10">
                <div className="flex items-center justify-center rounded-xl bg-secondary/30 border border-border/30 p-4">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={formData.name}
                      className="max-h-80 rounded-xl object-contain"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center">
                      <Sparkles className="h-12 w-12 text-primary animate-pulse-glow" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="mt-4 text-center font-display text-xl font-semibold text-foreground">{formData.name}</p>
            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep(1); setGeneratedLogos([]); setSelectedIndex(0); }}
                className="gap-2 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
                Start Over
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave()}
                disabled={isSaving || !selectedImage}
                className="gap-2 rounded-xl"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Selected"}
              </Button>
              {generatedLogos.length > 1 && (
                <Button
                  variant="outline"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="gap-2 rounded-xl"
                >
                  <Save className="h-4 w-4" />
                  Save All
                </Button>
              )}
              <Button
                onClick={() => handleDownload()}
                disabled={!selectedImage}
                className="gap-2 rounded-xl glow-blue"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </main>
      <LogoAdvisorChat formData={formData} />
    </div>
  );
};

export default CreateLogo;
