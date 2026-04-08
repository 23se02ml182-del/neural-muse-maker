import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, Download, Trash2, Plus, Clock, ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogoGeneration, LOGO_STYLE_LABELS, type LogoStyle } from "@/lib/logo-client";
import { toast } from "sonner";

const logoGenerationsTable = () => (supabase as any).from("logo_generations");

type FolderView = "history" | "saved" | "downloads";

interface SavedLogoRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  style: string | null;
  color_palette: string | null;
  industry: string | null;
  icon_idea: string | null;
  image_data: string;
  created_at: string;
}

const LOGO_STYLES: LogoStyle[] = ["mascot", "minimalist", "wordmark", "lettermark", "emblem", "abstract", "vintage", "geometric", "3d", "handdrawn"];

const isLogoStyle = (value: string): value is LogoStyle => LOGO_STYLES.includes(value as LogoStyle);

const normalizeLogoGeneration = (row: Record<string, any>): LogoGeneration => ({
  id: String(row.id ?? ""),
  user_id: row.user_id ? String(row.user_id) : null,
  business_name: String(row.business_name ?? ""),
  tagline: row.tagline ? String(row.tagline) : null,
  industry: String(row.industry ?? ""),
  style: isLogoStyle(row.style ?? "") ? row.style : "minimalist",
  colors: Array.isArray(row.colors) ? row.colors.filter((value: unknown): value is string => typeof value === "string") : null,
  mood: row.mood ? String(row.mood) : null,
  additional_instructions: row.additional_instructions ? String(row.additional_instructions) : null,
  image_url: row.image_url ? String(row.image_url) : null,
  prompt_used: String(row.prompt_used ?? ""),
  provider: row.provider ? String(row.provider) : null,
  status: row.status === "pending" || row.status === "failed" ? row.status : "completed",
  error_message: row.error_message ? String(row.error_message) : null,
  generation_ms: typeof row.generation_ms === "number" ? row.generation_ms : null,
  user_rating: typeof row.user_rating === "number" ? row.user_rating : null,
  was_downloaded: typeof row.was_downloaded === "boolean" ? row.was_downloaded : null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  completed_at: row.completed_at ? String(row.completed_at) : null,
});

const MyLogos = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeFolder, setActiveFolder] = useState<FolderView>("history");
  const [generations, setGenerations] = useState<LogoGeneration[]>([]);
  const [savedLogos, setSavedLogos] = useState<SavedLogoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === "object" && error !== null && "message" in error) {
      return String((error as { message?: string }).message ?? "Unknown error");
    }
    return "Unknown error";
  };

  const fetchCollections = useCallback(async () => {
    if (!user) return;
    try {
      const { data: historyData, error: historyError } = await logoGenerationsTable()
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      const { data: savedData, error: savedError } = await supabase
        .from("saved_logos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (savedError) throw savedError;

      setGenerations((historyData || []).map((row: Record<string, any>) => normalizeLogoGeneration(row)));
      setSavedLogos((savedData || []) as SavedLogoRow[]);
    } catch (err: unknown) {
      console.error("[MyLogos] Fetch error:", err);
      console.error("[MyLogos] Details:", getErrorMessage(err));
      toast.error("Failed to load your history");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchCollections();
  }, [user, fetchCollections]);

  useEffect(() => {
    const folder = new URLSearchParams(location.search).get("folder");
    if (folder === "saved" || folder === "downloads" || folder === "history") {
      setActiveFolder(folder);
    }
  }, [location.search]);

  const deleteGeneration = async (id: string) => {
    const { error } = await logoGenerationsTable().delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete record");
    } else {
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      toast.success("Record deleted");
    }
  };

  const deleteSavedLogo = async (id: string) => {
    const { error } = await supabase.from("saved_logos").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete saved logo");
      return;
    }
    setSavedLogos((prev) => prev.filter((row) => row.id !== id));
    toast.success("Saved logo removed");
  };

  const downloadLogo = async (gen: LogoGeneration) => {
    if (!gen.image_url) return;
    const link = document.createElement("a");
    link.href = gen.image_url;
    link.download = `${gen.business_name.replace(/\s+/g, '-').toLowerCase()}-logo.png`;
    link.click();

    await logoGenerationsTable()
      .update({ was_downloaded: true })
      .eq("id", gen.id);
  };

  const downloadSavedLogo = (row: SavedLogoRow) => {
    if (!row.image_data) return;
    const link = document.createElement("a");
    link.href = row.image_data;
    link.download = `${row.name.replace(/\s+/g, "-").toLowerCase()}-saved-logo.png`;
    link.click();
  };

  const isAlreadySaved = (gen: LogoGeneration) => {
    if (!gen.image_url) return false;
    return savedLogos.some((row) => row.image_data === gen.image_url);
  };

  const downloadedGenerations = generations.filter((gen) => gen.was_downloaded);

  const saveToCollection = async (gen: LogoGeneration) => {
    if (!user) {
      toast.error("Please sign in to save logos");
      return;
    }
    if (!gen.image_url) {
      toast.error("This logo has no image to save");
      return;
    }
    if (isAlreadySaved(gen)) {
      toast.info("This logo is already in your Saved folder");
      return;
    }

    setSavingIds((prev) => ({ ...prev, [gen.id]: true }));
    try {
      const { data, error } = await supabase.from("saved_logos").insert({
        user_id: user.id,
        name: gen.business_name,
        description: gen.tagline || null,
        style: gen.style || null,
        color_palette: gen.colors?.length ? gen.colors.join(", ") : null,
        industry: gen.industry || null,
        icon_idea: null,
        image_data: gen.image_url,
      }).select("*").single();
      if (error) throw error;
      if (data) setSavedLogos((prev) => [data as SavedLogoRow, ...prev]);
      toast.success("Saved to your collection");
    } catch (error) {
      console.error("[MyLogos] Save error:", error);
      toast.error("Failed to save this logo");
    } finally {
      setSavingIds((prev) => ({ ...prev, [gen.id]: false }));
    }
  };

  const renderEmptyState = () => {
    const isSavedFolder = activeFolder === "saved";
    const isDownloadsFolder = activeFolder === "downloads";
    return (
      <div className="relative group max-w-2xl mx-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-3xl blur opacity-20 transition duration-1000" />
        <div className="relative glass rounded-3xl p-20 text-center flex flex-col items-center border border-white/10 bg-black/40">
          <div className="w-20 h-20 rounded-2xl bg-secondary/30 flex items-center justify-center mb-6 shadow-inner border border-white/5">
            <Sparkles className="h-10 w-10 text-primary opacity-40 animate-pulse" />
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">
            {isSavedFolder ? "Saved Folder is Empty" : isDownloadsFolder ? "Downloads are Empty" : "History is Empty"}
          </h3>
          <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
            {isSavedFolder
              ? "Use Save Selected or Save All from the generator to build your premium saved collection."
              : isDownloadsFolder
                ? "Download a logo from History first, then it will appear here."
                : "No generated logos found in your history yet. Create your next premium logo now."}
          </p>
          <Link to="/create">
            <Button className="gap-2 h-12 px-8 rounded-xl glow-blue font-bold text-lg">
              <Plus className="h-5 w-5" />
              Start Creating
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-6 pt-28 pb-16">
        
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-8 bg-primary rounded-full" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/80">Studio History</span>
            </div>
            <h1 className="font-display text-4xl font-bold">
              My <span className="text-gradient">Masterpieces</span>
            </h1>
            <p className="mt-2 text-muted-foreground max-w-md">
              Review and manage your premium generated history and saved collection.
            </p>
          </div>
          <div className="flex gap-3">
             <Link to="/hf-generator">
              <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">
                <ExternalLink className="mr-2 h-4 w-4" /> HF Studio
              </Button>
            </Link>
            <Link to="/create">
              <Button className="gap-2 rounded-xl glow-blue font-bold">
                <Plus className="h-4 w-4" />
                New Design
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveFolder("history")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
              activeFolder === "history"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-white/10 bg-secondary/20 text-muted-foreground hover:border-primary/40"
            }`}
          >
            History ({generations.length})
          </button>
          <button
            onClick={() => setActiveFolder("saved")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
              activeFolder === "saved"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-white/10 bg-secondary/20 text-muted-foreground hover:border-primary/40"
            }`}
          >
            Saved ({savedLogos.length})
          </button>
          <button
            onClick={() => setActiveFolder("downloads")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
              activeFolder === "downloads"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-white/10 bg-secondary/20 text-muted-foreground hover:border-primary/40"
            }`}
          >
            Downloads ({downloadedGenerations.length})
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-80 gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-medium animate-pulse opacity-60">Accessing archives...</p>
          </div>
        ) : activeFolder === "history" && generations.length === 0 ? (
          renderEmptyState()
        ) : activeFolder === "saved" && savedLogos.length === 0 ? (
          renderEmptyState()
        ) : activeFolder === "downloads" && downloadedGenerations.length === 0 ? (
          renderEmptyState()
        ) : activeFolder === "history" ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {generations.map((gen) => (
              <div key={gen.id} className="group glass rounded-3xl overflow-hidden border border-white/10 hover:border-primary/40 transition-all duration-500 hover:translate-y-[-4px]">
                
                {/* Image Preview */}
                <div className="aspect-square bg-white relative overflow-hidden flex items-center justify-center">
                  <img
                    src={gen.image_url || "https://placehold.co/400?text=Pending"}
                    alt={gen.business_name}
                    className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110"
                  />
                  {!gen.image_url && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>

                {/* Info Overlay */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-xl truncate">{gen.business_name}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(gen.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold uppercase truncate max-w-[120px]">
                      {LOGO_STYLE_LABELS[gen.style as keyof typeof LOGO_STYLE_LABELS] || gen.style}
                    </span>
                    <span className="text-[10px] px-2 py-1 bg-secondary border border-white/5 rounded-full font-medium truncate max-w-[120px]">
                      {gen.industry}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!gen.image_url}
                      onClick={() => downloadLogo(gen)}
                      className="flex-1 rounded-xl bg-white text-black hover:bg-white/90 font-bold h-10"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!gen.image_url || !!savingIds[gen.id] || isAlreadySaved(gen)}
                      onClick={() => saveToCollection(gen)}
                      className="flex-1 rounded-xl border-white/10 hover:bg-white/5 h-10"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isAlreadySaved(gen) ? "Saved" : savingIds[gen.id] ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteGeneration(gen.id)}
                      className="w-10 rounded-xl border-white/10 text-destructive hover:bg-destructive/10 h-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeFolder === "downloads" ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {downloadedGenerations.map((gen) => (
              <div key={gen.id} className="group glass rounded-3xl overflow-hidden border border-white/10 hover:border-primary/40 transition-all duration-500 hover:translate-y-[-4px]">
                <div className="aspect-square bg-white relative overflow-hidden flex items-center justify-center">
                  <img
                    src={gen.image_url || "https://placehold.co/400?text=Pending"}
                    alt={gen.business_name}
                    className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-tighter">
                    Downloaded
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-xl truncate">{gen.business_name}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(gen.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold uppercase truncate max-w-[120px]">
                      {LOGO_STYLE_LABELS[gen.style as keyof typeof LOGO_STYLE_LABELS] || gen.style}
                    </span>
                    <span className="text-[10px] px-2 py-1 bg-secondary border border-white/5 rounded-full font-medium truncate max-w-[120px]">
                      {gen.industry}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!gen.image_url}
                      onClick={() => downloadLogo(gen)}
                      className="flex-1 rounded-xl bg-white text-black hover:bg-white/90 font-bold h-10"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download Again
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!gen.image_url || !!savingIds[gen.id] || isAlreadySaved(gen)}
                      onClick={() => saveToCollection(gen)}
                      className="flex-1 rounded-xl border-white/10 hover:bg-white/5 h-10"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isAlreadySaved(gen) ? "Saved" : savingIds[gen.id] ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteGeneration(gen.id)}
                      className="w-10 rounded-xl border-white/10 text-destructive hover:bg-destructive/10 h-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {savedLogos.map((row) => (
              <div key={row.id} className="group glass rounded-3xl overflow-hidden border border-white/10 hover:border-primary/40 transition-all duration-500 hover:translate-y-[-4px]">
                <div className="aspect-square bg-white relative overflow-hidden flex items-center justify-center">
                  <img
                    src={row.image_data}
                    alt={row.name}
                    className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-tighter">
                    Saved
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-xl truncate">{row.name}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(row.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {row.style && (
                      <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold uppercase truncate max-w-[120px]">
                        {LOGO_STYLE_LABELS[row.style as keyof typeof LOGO_STYLE_LABELS] || row.style}
                      </span>
                    )}
                    {row.industry && (
                      <span className="text-[10px] px-2 py-1 bg-secondary border border-white/5 rounded-full font-medium truncate max-w-[120px]">
                        {row.industry}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => downloadSavedLogo(row)}
                      className="flex-1 rounded-xl bg-white text-black hover:bg-white/90 font-bold h-10"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSavedLogo(row.id)}
                      className="w-10 rounded-xl border-white/10 text-destructive hover:bg-destructive/10 h-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyLogos;
