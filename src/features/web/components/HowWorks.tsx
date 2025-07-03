import React, { useState } from "react";

import step01 from "../../../assets/web/01.webp";
import step02 from "../../../assets/web/02.webp";
import step03 from "../../../assets/web/03.webp";

const HowWorks: React.FC = () => {
  const [modalImageIndex, setModalImageIndex] = useState<number | null>(null);

  const steps = [
    {
      number: "01",
      title: "Completa el formulario",
      image: step01,
      alt: "Formulario de creación de contenido",
    },
    {
      number: "02",
      title: "Genera las publicaciones",
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

  const openModal = (imageIndex: number) => {
    setModalImageIndex(imageIndex);
  };

  const closeModal = () => {
    setModalImageIndex(null);
  };

  const goToPrevious = () => {
    if (modalImageIndex !== null) {
      const prevIndex =
        modalImageIndex === 0 ? steps.length - 1 : modalImageIndex - 1;
      setModalImageIndex(prevIndex);
    }
  };

  const goToNext = () => {
    if (modalImageIndex !== null) {
      const nextIndex =
        modalImageIndex === steps.length - 1 ? 0 : modalImageIndex + 1;
      setModalImageIndex(nextIndex);
    }
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

        <div className="border-t border-gray-200 mb-12"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="flex items-end justify-center mb-12">
                <span className="text-5xl md:text-6xl font-bold text-gray-900 leading-none">
                  {step.number}.
                </span>
                <h3 className="text-md font-semibold text-gray-900 ml-2 mb-2">
                  {step.title}
                </h3>
              </div>
              <div className="cursor-pointer" onClick={() => openModal(index)}>
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

      {modalImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
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

            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all z-10"
            >
              <svg
                className="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all z-10"
            >
              <svg
                className="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <img
              src={steps[modalImageIndex].image}
              alt={steps[modalImageIndex].alt}
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setModalImageIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === modalImageIndex
                      ? "bg-white"
                      : "bg-white bg-opacity-50 hover:bg-opacity-75"
                  }`}
                />
              ))}
            </div>

            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-center">
              <p className="text-black text-lg font-semibold">
                {steps[modalImageIndex].number}. {steps[modalImageIndex].title}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HowWorks;
