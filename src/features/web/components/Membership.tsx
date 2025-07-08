import React, { useState } from "react";

const Membership: React.FC = () => {
  const [billingType, setBillingType] = useState<"monthly" | "annual">(
    "annual"
  );
  const [postsPerMonth, setPostsPerMonth] = useState(15);
  const [pricePerHour, setPricePerHour] = useState(20);

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
      name: "Básico",
      subtitle: "Versión limitada",
      price: { monthly: 18, annual: 144 },
      buttonText: "Empezar",
      buttonStyle: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      cardStyle: "bg-white border border-gray-200",
      features: [
        "Hasta 10 publicaciones al mes",
        "Integración OpenAI",
        "Instagram",
        "Linkedin",
      ],
    },
    {
      name: "Profesional",
      subtitle: "Versión ilimitada",
      price: { monthly: 24, annual: 192 },
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
            Publica en redes sociales fácilmente.
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

      {/* Sección de tiempo ahorrado */}
      <div className="max-w-4xl mx-auto mt-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Tiempo ahorrado
            </h3>
            <p className="text-gray-600">
              Descubre el impacto real optimizando la creación de contenido en
              LinkedIn e Instagram
            </p>
          </div>

          <div className="space-y-8">
            {/* Posts al mes */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-lg font-medium text-gray-900">
                  Posts al mes
                </label>
                <span className="text-2xl font-bold text-black">
                  {postsPerMonth}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={postsPerMonth}
                  onChange={(e) => setPostsPerMonth(Number(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(postsPerMonth / 60) * 100}%, #dbeafe ${(postsPerMonth / 60) * 100}%, #dbeafe 100%)`,
                  }}
                />
              </div>
            </div>

            {/* Precio hora */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <label className="text-lg font-medium text-gray-900 mr-2">
                    Precio hora
                  </label>
                  <div className="group relative">
                    <svg
                      className="w-4 h-4 text-gray-400 cursor-help"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <span className="text-2xl font-bold text-black">
                  {pricePerHour}€
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(Number(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((pricePerHour - 5) / 45) * 100}%, #dbeafe ${((pricePerHour - 5) / 45) * 100}%, #dbeafe 100%)`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Ahorro anual
              </h4>
              <p className="text-3xl font-bold text-black">
                €{Math.round(postsPerMonth * pricePerHour * 12 * 0.6)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Ahorro mensual
              </h4>
              <p className="text-3xl font-bold text-black">
                €{Math.round(postsPerMonth * pricePerHour * 0.6)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Membership;
