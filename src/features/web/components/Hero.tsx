import React from "react";

import heroImage from "@/assets/web/hero.webp";
import heroImage2 from "@/assets/web/hero2.webp";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";

const Hero: React.FC = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <section className="w-full bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            <CarouselItem>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="text-center lg:text-left order-1">
                  <h1 className="text-2xl tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
                    Ahorra tiempo y mejora tu presencia en redes sociales
                  </h1>
                  <p className="mt-6 text-md leading-8 text-gray-600">
                    Simplifica el proceso de elaboración, revisión y publicación
                    de contenido para tu estudio de arquitectura o diseño
                    mediante herramientas de IA.
                  </p>
                </div>
                <div className="flex justify-center lg:justify-end order-2">
                  <div className="w-full max-w-lg">
                    <img
                      src={heroImage}
                      alt="Hero slide 1"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="flex justify-center lg:justify-start order-2 lg:order-1">
                  <div className="w-full max-w-lg">
                    <img
                      src={heroImage2}
                      alt="Hero slide 2"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="text-center lg:text-left order-1 lg:order-2">
                  <h1 className="text-2xl tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
                    Crea GPTs personalizados
                  </h1>
                  <p className="mt-6 text-md leading-8 text-gray-600">
                    Entrena un GPT para generar textos que se ajusten a tu
                    identidad de marca, tu tono y tu forma de entender la
                    arquitectura. Porque comunicar bien también es una forma de
                    proyectar.
                  </p>
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        {count > 1 && api && (
          <div className="mt-6 flex justify-center gap-3">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => api.scrollTo(index)}
                className={[
                  "h-3 w-3 rounded-full transition-all",
                  current === index
                    ? "bg-gray-900 scale-110"
                    : "bg-gray-300 hover:bg-gray-400",
                ].join(" ")}
                aria-label={`Ir al slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
