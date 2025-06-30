import React, { useState } from "react";

const Membership: React.FC = () => {
  const [billingType, setBillingType] = useState<"monthly" | "annual">(
    "monthly"
  );

  const scrollToContact = () => {
    const element = document.getElementById("contacto");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const plans = [
    {
      name: "Gratis",
      subtitle: "Versión limitada",
      price: { monthly: 0, annual: 0 },
      buttonText: "Probar gratis",
      buttonStyle: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      cardStyle: "bg-white border border-gray-200",
      features: [
        "Hasta 5 publicaciones",
        "Integración OpenAI",
        "Instagram",
        "Linkedin",
      ],
    },
    {
      name: "Profesional",
      subtitle: "Versión ilimitada",
      price: { monthly: 15, annual: 144 },
      buttonText: "Empezar",
      buttonStyle: "bg-gray-600 text-white hover:bg-gray-700",
      cardStyle: "bg-black text-white border border-gray-800",
      featured: true,
      features: [
        "Publicaciones ilimitadas",
        "Integración OpenAI",
        "Instagram",
        "Linkedin",
      ],
    },
    {
      name: "Consultoría",
      subtitle:
        "Servicios de comunicación para mejorar la imagen de tu empresa",
      price: null,
      buttonText: "Contactar",
      buttonStyle: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      cardStyle: "bg-white border border-gray-200",
      features: [
        "Gestión de redes sociales",
        "Identidad corporativa",
        "Diseño web",
        "Fotografía de arquitectura",
      ],
    },
  ];

  return (
    <section className="w-full bg-gray-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
            Precios
          </p>
          <h2 className="text-3xl font-medium text-gray-900 sm:text-4xl">
            Publica en redes sociales fácilmente. Empieza gratis.
          </h2>
        </div>
        {/* Toggle mensual/anual */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setBillingType("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingType === "monthly"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingType("annual")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingType === "annual"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        {/* Grid de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow ${plan.cardStyle}`}
            >
              {/* Header del plan */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p
                  className={`text-sm mb-6 ${plan.cardStyle.includes("black") ? "text-gray-300" : "text-gray-600"}`}
                >
                  {plan.subtitle}
                </p>

                {/* Precio */}
                {plan.price !== null ? (
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {billingType === "monthly"
                        ? plan.price.monthly
                        : Math.floor(plan.price.annual / 12)}
                      €
                    </span>
                    <span
                      className={`text-sm ml-1 ${plan.cardStyle.includes("black") ? "text-gray-400" : "text-gray-500"}`}
                    >
                      /mensual
                    </span>
                  </div>
                ) : (
                  <div className="mb-12"></div>
                )}

                {/* Botón */}
                <button
                  onClick={scrollToContact}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${plan.buttonStyle}`}
                >
                  {plan.buttonText}
                </button>
              </div>

              {/* Lista de características */}
              <ul className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <svg
                      className={`w-5 h-5 mr-3 ${plan.cardStyle.includes("black") ? "text-white" : "text-blue-500"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span
                      className={`text-sm ${plan.cardStyle.includes("black") ? "text-gray-200" : "text-gray-600"}`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Nota de impuestos */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Impuestos no incluidos.
        </p>
      </div>
    </section>
  );
};

export default Membership;
