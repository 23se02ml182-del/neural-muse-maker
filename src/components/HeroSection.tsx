import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HeroSection = () => {
  const [logoName, setLogoName] = useState("");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (logoName.trim()) {
      navigate(`/create?name=${encodeURIComponent(logoName.trim())}`);
    } else {
      navigate("/create");
    }
  };

  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden pt-20">
      <div className="container relative z-10 mx-auto px-6 text-center">
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl">
          <span className="text-gradient">AI Logo Maker</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Perfect Logos for Apps, Businesses, and Websites
        </p>

        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Craft unique and professional logos effortlessly with our AI-powered tool.
          Perfect for apps, businesses, websites, and more!
        </p>

        <div className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 sm:flex-row">
          <Input
            placeholder="Enter your Logo Name"
            value={logoName}
            onChange={(e) => setLogoName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGetStarted()}
            className="h-14 rounded-xl border-border bg-background px-6 text-base shadow-sm placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="h-14 gap-2 rounded-xl px-8 font-semibold glow-blue"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
