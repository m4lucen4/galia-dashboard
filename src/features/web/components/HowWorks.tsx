import React, { useState } from "react";

import step01 from "../../../assets/web/01.webp";
import step02 from "../../../assets/web/02.webp";
import step03 from "../../../assets/web/03.webp";

const HowWorks: React.FC = () => {
  const [modalImage, setModalImage] = useState<string | null>(null);

  const steps = [
    {
      number: "01",
      title: "Completa el formulario",
      image: step01,
      alt: "Formulario de creación de contenido",
    },
    {
      number: "02",
      title: "Genera con IA",
      image: step02,
      alt: "Generación de contenido con IA",
    },
    {
      number: "03",
      title: "Publica en redes sociales",
      image: step03,
      alt: "Publicación en redes sociales",
    },
  ];

  const openModal = (image: string) => {
    setModalImage(image);
  };

  const closeModal = () => {
    setModalImage(null);
  };

  return (
    <section className="w-full bg-white py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start mb-12">
          <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
              Proceso simplificado
            </p>
            <h2 className="text-3xl font-medium text-gray-900 sm:text-4xl">
              Cómo funciona
            </h2>
          </div>
          <div>
            <p className="text-sm text-gray-600 leading-relaxed">
              El proceso es tan sencillo como añadir la información (título,
              textos, imágenes, localización, etc.) a través de un formulario
              web, lanzar la aplicación para generar las publicaciones mediante
              IA y revisar los textos e imágenes que quieras programar para su
              publicación en redes sociales.
            </p>
          </div>
        </div>

        {/* Línea separadora */}
        <div className="border-t border-gray-200 mb-12"></div>

        {/* Sección de pasos con 3 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-12">
                {step.number}. {step.title}
              </h3>
              <div
                className="cursor-pointer"
                onClick={() => openModal(step.image)}
              >
                <img
                  src={step.image}
                  alt={step.alt}
                  className="w-full h-64 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para imagen ampliada */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeModal}
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={modalImage}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default HowWorks;
