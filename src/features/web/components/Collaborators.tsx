import React from "react";

const Collaborators: React.FC = () => {
  const collaborators = [
    {
      name: "ámbito arquitectura",
    },
    {
      name: "Pablo Baruc Arquitecto",
    },
    {
      name: "ngnp arquitectos",
    },
    {
      name: "Calvente Design",
    },
  ];

  return (
    <section className="w-full bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Título */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-medium text-gray-900 sm:text-4xl">
            Empresas que confían en mocklab.
          </h2>
        </div>

        {/* Grid de colaboradores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collaborators.map((collaborator, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-8 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <h3 className="text-lg font-bold text-gray-900">
                {collaborator.name}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Collaborators;
