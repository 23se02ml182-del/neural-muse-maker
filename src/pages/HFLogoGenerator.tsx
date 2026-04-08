import React, { useState } from "react";
import { Download, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateLogo } from "@/lib/logo-client";
import { toast } from "sonner";

function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e;
}

const HFLogoGenerator = () => {
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [colors, setColors] = useState("");
  const [mood, setMood] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!businessName || !industry) {
      toast.error("Business Name and Industry are required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setStatusMessage("Initializing...");

    try {
      const result = await generateLogo({
        businessName,
        industry,
        style: "mascot",
        colors: colors ? colors.split(",").map(c => c.trim()) : undefined,
        mood: mood || undefined,
      }, (status, message) => {
        setStatusMessage(message);
      });

      setGeneratedImage(result.imageUrl);
      toast.success("Logo generated successfully!");
    } catch (err: unknown) {
      const message = isErrorWithMessage(err) ? err.message : "An unexpected error occurred.";
      console.warn("Logo generation failed:", message);
      setError(message);
      setGeneratedImage(null);
      toast.error(message || "Generation failed. Please retry.");
    } finally {
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `${businessName.replace(/\s+/g, '-').toLowerCase()}-logo.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-28 pb-16">
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[1fr_1.2fr] text-foreground">
          
          {/* Form Area */}
          <div className="glass rounded-2xl p-8 space-y-6 border border-white/10 shadow-2xl h-fit">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Logo Engine Pro</h2>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Premium-first AI pipeline
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold opacity-80">Business Name</label>
                <Input
                  required
                  placeholder="e.g. Quantum Dynamics"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="bg-secondary/30 border-white/5 rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold opacity-80">Industry</label>
                <Input
                  required
                  placeholder="e.g. Sustainable Energy"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="bg-secondary/30 border-white/5 rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold opacity-80">Design Style</label>
                <div className="flex h-11 w-full items-center rounded-xl border border-primary/20 bg-primary/10 px-3 text-sm font-semibold text-primary">
                  Mascot Premium (Locked)
                </div>
                <p className="text-[10px] text-muted-foreground italic px-1">
                  Backend-enforced premium mascot mode for consistent output.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-80">Colors (opt)</label>
                  <Input
                    placeholder="e.g. Navy, Gold"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    className="bg-secondary/30 border-white/5 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-80">Mood/Tone (opt)</label>
                  <Input
                    placeholder="e.g. Bold, Clean"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="bg-secondary/30 border-white/5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl mt-4 glow-blue font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? "System Running..." : "Generate Masterpiece"}
              </Button>
            </form>
          </div>

          {/* Result Area */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative glass rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px] text-center border border-white/10 bg-black/20 backdrop-blur-xl">
              
              {isLoading ? (
                <div className="flex flex-col items-center gap-6 text-primary">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-display font-bold tracking-tight animate-pulse">
                      {statusMessage}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                      Premium providers can be slower at busy times. Please wait a moment.
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-4 text-destructive animate-in fade-in zoom-in">
                  <div className="p-4 bg-destructive/10 rounded-full">
                    <AlertCircle className="w-12 h-12" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-lg">Generation Halted</p>
                    <p className="text-sm opacity-80 max-w-xs mx-auto">{error}</p>
                  </div>
                  <Button variant="outline" onClick={() => handleGenerate()} className="mt-4 border-destructive/20 hover:bg-destructive/10">
                    <RefreshCw className="mr-2 h-4 w-4" /> Restart Engine
                  </Button>
                </div>
              ) : generatedImage ? (
                <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="relative group/img overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-white mb-8 group-hover:border-primary/50 transition-colors">
                    <img
                      src={generatedImage}
                      alt="Generated Logo"
                      className="w-full max-w-md object-contain aspect-square transition-transform duration-700 group-hover/img:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-center pb-6">
                      <p className="text-white text-xs font-bold px-3 py-1 bg-black/60 rounded-full backdrop-blur-md border border-white/20">
                         PREVIEW AT 1024 x 1024
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 w-full max-w-md">
                    <Button onClick={handleDownload} variant="default" className="flex-1 h-12 rounded-xl font-bold bg-white text-black hover:bg-gray-100">
                      <Download className="mr-3 h-5 w-5" /> Save PNG
                    </Button>
                    <Button variant="outline" onClick={() => handleGenerate()} className="flex-1 h-12 rounded-xl border-white/10 hover:bg-white/5">
                      <RefreshCw className="mr-3 h-5 w-5" /> Regenerate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center max-w-sm">
                  <div className="w-24 h-24 rounded-3xl bg-secondary/20 mb-6 flex items-center justify-center border border-white/5 shadow-inner">
                    <Sparkles className="w-10 h-10 opacity-30" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-2">Ready to Create?</h3>
                  <p className="text-sm opacity-60 leading-relaxed mb-8">
                    Describe your brand on the left. Our premium AI pipeline will craft a custom,
                    scalable logo that captures your business mission.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 opacity-40">
                    <span className="text-[10px] px-2 py-1 border border-white/20 rounded-full uppercase">Professional</span>
                    <span className="text-[10px] px-2 py-1 border border-white/20 rounded-full uppercase">High Fidelity</span>
                    <span className="text-[10px] px-2 py-1 border border-white/20 rounded-full uppercase">Vector Style</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HFLogoGenerator;
