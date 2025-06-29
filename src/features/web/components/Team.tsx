import React from "react";

import malucena from "../../../assets/web/malucena.jpg";
import nachovillegas from "../../../assets/web/nachovillegas.jpg";

const Team: React.FC = () => {
  const teamMembers = [
    {
      name: "Miguel Ángel Lucena",
      role: "FRONTEND DEVELOPER",
      roleSubtitle: "SENIOR",
      description: "Desarrollo y consultoría de aplicaciones web y móviles.",
      image: malucena,
      linkedinUrl: "https://www.linkedin.com/in/malucena80",
    },
    {
      name: "Nacho Villegas",
      role: "ARQUITECTO",
      roleSubtitle: "",
      description: "Visualización 3d y comunicación de arquitectura.",
      image: nachovillegas,
      linkedinUrl: "https://www.linkedin.com/in/nachovillegas/",
    },
  ];

  const openLinkedIn = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="w-full bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            EQUIPO
          </p>
          <h2 className="text-3xl font-medium text-gray-900 sm:text-4xl mb-4">
            Somos mocklab.
          </h2>
          <p className="text-md text-gray-600 max-w-4xl mx-auto">
            El equipo está formado por un grupo de profesionales que de forma
            independiente lleva más de 15 años dedicados a la comunicación de
            arquitectura y al desarrollo de aplicaciones. Inquietudes e
            ilusiones compartidas nos han unido para el desarrollo de esta
            aplicación con la que esperamos ahorrar tiempo a otras empresas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="flex flex-col lg:flex-row items-center lg:items-start gap-6"
            >
              <div className="flex-shrink-0">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-64 h-64 object-cover rounded-lg"
                />
              </div>

              <div className="text-center lg:text-left lg:pt-4">
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {member.role}
                  </p>
                  {member.roleSubtitle && (
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {member.roleSubtitle}
                    </p>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {member.name}
                </h3>

                <p className="text-gray-600 leading-relaxed mb-6">
                  {member.description}
                </p>

                <button
                  onClick={() => openLinkedIn(member.linkedinUrl)}
                  className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-full hover:bg-gray-800 transition-colors duration-200"
                  aria-label={`LinkedIn de ${member.name}`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;
