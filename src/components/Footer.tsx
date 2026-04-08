import { Sparkles } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 text-center">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-bold text-foreground">
            Logo<span className="text-gradient">AI</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 LogoAI. Create stunning logos with artificial intelligence.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
