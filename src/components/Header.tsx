import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Download,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useLogoPreferences } from "@/hooks/useLogoPreferences";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const styleOptions = [
  { id: "auto", label: "Auto" },
  { id: "modern", label: "Modern" },
  { id: "minimalist", label: "Minimalist" },
  { id: "vintage", label: "Vintage" },
  { id: "futuristic", label: "Futuristic" },
  { id: "geometric", label: "Geometric" },
  { id: "cartoon", label: "Cartoon" },
];

const paletteOptions = [
  { id: "auto", label: "Auto" },
  { id: "dark-gold", label: "Dark & Gold" },
  { id: "blue-cyan", label: "Blue & Cyan" },
  { id: "monochrome", label: "Mono" },
  { id: "ocean", label: "Ocean" },
];

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { preferences, updatePreference, resetPreferences } = useLogoPreferences();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!settingsOpen) return;
      const target = event.target as Node | null;
      if (target && settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
    } catch {
      toast.success("Signed out");
    }
    window.location.href = "/auth";
  };

  const openPage = (path: string) => {
    setSettingsOpen(false);
    setMobileOpen(false);
    navigate(path);
  };

  const toggleCompactMode = () => {
    updatePreference("compactMode", !preferences.compactMode);
  };

  const toggleAutoSave = () => {
    updatePreference("autoSaveDownloads", !preferences.autoSaveDownloads);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary glow-blue">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Logo<span className="text-gradient">AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-3 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen((value) => !value)}
            className={cn(
              "rounded-xl text-muted-foreground hover:text-foreground",
              settingsOpen && "bg-accent text-foreground",
            )}
            aria-label="Open settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>

          {user ? (
            <>
              <Link to="/my-logos">
                <Button variant="ghost" className="gap-2 rounded-xl text-muted-foreground hover:text-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  {displayName}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="rounded-xl text-muted-foreground hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" className="gap-2 rounded-xl text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
          )}
          <Link to="/create">
            <Button className="rounded-xl font-semibold glow-blue">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen((value) => !value)}
            className={cn(
              "rounded-xl text-muted-foreground hover:text-foreground",
              settingsOpen && "bg-accent text-foreground",
            )}
            aria-label="Open settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <button
            className="p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="absolute right-4 top-[4.25rem] z-50 w-[calc(100vw-2rem)] max-w-md">
          <div
            ref={settingsRef}
            className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141418] text-white shadow-2xl shadow-black/40"
          >
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/45">
                    User settings
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Quick preferences</h3>
                  <p className="mt-1 text-sm text-white/60">
                    Set your default logo style and the way the studio feels.
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[72vh] space-y-5 overflow-y-auto px-3 py-4">
              <div className="space-y-1">
                {[
                  { label: "Create logo", icon: LayoutGrid, action: () => openPage("/create") },
                  { label: "My logos", icon: History, action: () => openPage("/my-logos") },
                  { label: "HF generator", icon: Sparkles, action: () => openPage("/hf-generator") },
                  { label: "Downloads", icon: Download, action: () => openPage("/my-logos?folder=downloads") },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/6"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-white/90">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-white/45">Open this workspace section</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/35" />
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-white/4 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/45">Default style</p>
                    <p className="text-sm text-white/60">Used when the user does not pick one manually.</p>
                  </div>
                  <button
                    onClick={resetPreferences}
                    className="text-xs font-medium text-white/50 transition-colors hover:text-white"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {styleOptions.map((style) => {
                    const active = preferences.defaultStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => updatePreference("defaultStyle", style.id)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                          active
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                        )}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-white/4 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">Default palette</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {paletteOptions.map((palette) => {
                    const active = preferences.defaultPalette === palette.id;
                    return (
                      <button
                        key={palette.id}
                        onClick={() => updatePreference("defaultPalette", palette.id)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                          active
                            ? "border-sky-400 bg-sky-500/20 text-sky-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                        )}
                      >
                        {palette.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-white/4 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Compact mode</p>
                      <p className="text-xs text-white/45">Tighter spacing across logo screens.</p>
                    </div>
                    <button
                      onClick={toggleCompactMode}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        preferences.compactMode
                          ? "bg-emerald-500/20 text-emerald-100"
                          : "bg-white/8 text-white/60",
                      )}
                    >
                      {preferences.compactMode ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Auto-save downloads</p>
                      <p className="text-xs text-white/45">Save downloaded logos to your collection.</p>
                    </div>
                    <button
                      onClick={toggleAutoSave}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        preferences.autoSaveDownloads
                          ? "bg-emerald-500/20 text-emerald-100"
                          : "bg-white/8 text-white/60",
                      )}
                    >
                      {preferences.autoSaveDownloads ? "On" : "Off"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-3">
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/6"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-white/90">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">Sign out</p>
                      <p className="text-xs text-white/45">End this session on the device.</p>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => openPage("/auth")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/6"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-white/90">
                      <LogOut className="h-4 w-4 rotate-180" />
                    </span>
                    <div>
                      <p className="font-medium">Sign in</p>
                      <p className="text-xs text-white/45">Unlock saved logos and history.</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="space-y-2 border-t border-border bg-background px-6 py-4 sm:hidden">
          <button
            onClick={() => {
              setMobileOpen(false);
              setSettingsOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Open settings</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {user ? (
            <>
              <Link to="/my-logos" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  {displayName}
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  handleSignOut();
                  setMobileOpen(false);
                }}
                className="w-full justify-start gap-2"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                Sign In
              </Button>
            </Link>
          )}
          <Link to="/create" onClick={() => setMobileOpen(false)}>
            <Button className="w-full rounded-xl font-semibold glow-blue">Get Started</Button>
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;
