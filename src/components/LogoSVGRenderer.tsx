import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToPNG } from "@/lib/logo-engine";
import { GeneratedLogo } from "@/lib/logo-engine/types";
import { toast } from "sonner";

interface LogoSVGRendererProps {
  logo: GeneratedLogo;
  className?: string;
}

export function LogoSVGRenderer({ logo, className = "" }: LogoSVGRendererProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPNG = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsExporting(true);
      const pngDataUrl = await exportToPNG(logo.dataUrl, 1024);
      const link = document.createElement("a");
      link.href = pngDataUrl;
      link.download = `${logo.config.input.businessName || "logo"}-hd.png`.replace(/\s+/g, '-').toLowerCase();
      link.click();
      toast.success("Downloaded as PNG");
    } catch (err) {
      toast.error("Failed to export PNG");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSVG = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const link = document.createElement("a");
      link.href = logo.dataUrl;
      link.download = `${logo.config.input.businessName || "logo"}-vector.svg`.replace(/\s+/g, '-').toLowerCase();
      link.click();
      toast.success("Downloaded as SVG");
    } catch (err) {
      toast.error("Failed to download SVG");
      console.error(err);
    }
  };

  return (
    <div className={`group relative w-full h-full flex flex-col items-center justify-center ${className}`}>
      {/* The SVG Image */}
      <img src={logo.dataUrl} alt="Logo Variation" className="w-full h-full object-contain" />
      
      {/* Hover action overlay down bottom */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="secondary" 
          size="sm" 
          className="h-7 px-2 text-[10px] bg-background/80 hover:bg-background shadow-sm rounded-full backdrop-blur-sm"
          onClick={handleDownloadSVG}
        >
          SVG
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          className="h-7 px-2 text-[10px] bg-primary/90 text-primary-foreground hover:bg-primary shadow-sm rounded-full backdrop-blur-sm"
          onClick={handleDownloadPNG}
          disabled={isExporting}
        >
          {isExporting ? "..." : "PNG"}
        </Button>
      </div>
    </div>
  );
}
