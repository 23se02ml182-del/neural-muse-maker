import exampleLogo1 from "@/assets/example-logo-1.png";
import exampleLogo2 from "@/assets/example-logo-2.png";
import exampleLogo3 from "@/assets/example-logo-3.png";
import exampleLogo4 from "@/assets/example-logo-4.png";
import exampleLogo5 from "@/assets/example-logo-5.png";
import exampleLogo6 from "@/assets/example-logo-6.png";

const logos = [
  { src: exampleLogo1, name: "FoodRush", desc: "Food Delivery App" },
  { src: exampleLogo2, name: "NexCode", desc: "Tech Company" },
  { src: exampleLogo3, name: "BrewHouse", desc: "Coffee Shop" },
  { src: exampleLogo4, name: "PowerFit", desc: "Fitness & Gym" },
  { src: exampleLogo5, name: "PixelPlay", desc: "Gaming Studio" },
  { src: exampleLogo6, name: "Aurelia", desc: "Fashion Brand" },
];

const LogoGallery = () => {
  return (
    <section className="relative py-20">
      <div className="container mx-auto px-6">
        <h2 className="mb-2 text-center font-display text-3xl font-bold text-foreground">
          Logos Created with <span className="text-gradient">Premium AI Pipeline</span>
        </h2>
        <p className="mb-12 text-center text-muted-foreground">
          See what the generator can create for your brand
        </p>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="group glass rounded-2xl p-4 transition-all duration-300 hover:shadow-md hover:border-primary/30"
            >
              <div className="relative mb-4 overflow-hidden rounded-xl bg-secondary">
                <img
                  src={logo.src}
                  alt={`${logo.name} logo`}
                  className="aspect-square w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{logo.name}</h3>
              <p className="text-sm text-muted-foreground">{logo.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogoGallery;
