import React, { useState } from "react";

const Faqs: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "¿Necesito permisos para enviar mi propio trabajo?",
      answer:
        "Al enviar material para su publicación estás autorizando su uso en tanto en la web como en las redes sociales de nuestro medio. Por lo tanto debe informar y contar con el permiso de sus autores, quienes aparecerán en los créditos del material publicado.",
    },
    {
      question:
        "¿Puede integrarse con otras plataformas como Twitter o Wordpress?",
      answer:
        "Actualmente seguimos trabajando para desarrollar nuevas funcionalidades incluyendo la publicación en Wordpress. Twitter no está previsto a corto plazo, dependerá del feedback que recibamos por parte de la comnunidad de usuarios.",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section className="w-full bg-gray-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-medium text-gray-900 sm:text-4xl mb-4">
            Preguntas frecuentes
          </h2>
          <p className="text-md text-gray-600 max-w-4xl mx-auto">
            Aquí encontrarás respuestas a las preguntas más comunes sobre el uso
            de la aplicación.
            <br />
            Si tienes alguna otra duda, no dudes en contactarnos.
          </p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors duration-200"
              >
                <span className="text-lg font-medium text-gray-900 pr-4">
                  {faq.question}
                </span>
                <div className="flex-shrink-0">
                  <svg
                    className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${
                      openFaq === index ? "rotate-45" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
              </button>

              {openFaq === index && (
                <div className="px-6 pb-4">
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faqs;
