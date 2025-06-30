import React from "react";

import heroImage from "../../../assets/web/hero.webp";

const Hero: React.FC = () => {
  return (
    <section className="w-full bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              Ahorra tiempo y mejora tu presencia en redes sociales
            </h1>
            <p className="mt-6 text-md leading-8 text-gray-600">
              Simplifica la creación de contenido mediante IA rellenando un
              sencillo formulario a partir de la información básica de cada
              proyecto.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-lg">
              <img src={heroImage} alt="Hero image" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
