import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import LogoGallery from "@/components/LogoGallery";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <LogoGallery />
      <Footer />
    </div>
  );
};

export default Index;
