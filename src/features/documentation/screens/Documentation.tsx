import Navbar from "../../../components/shared/ui/Navbar";
import {
  CheckCircleIcon,
  LightBulbIcon,
  UserGroupIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

export const Documentation = () => {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        {/* Hero Section */}
        <div className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 via-gray-50/50 to-gray-200/50"></div>
          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Wiki
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Aprende a conectar tus redes sociales, crear GPTs personalizados
                y optimizar tus publicaciones de arquitectura
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-4xl mx-auto space-y-16">
            {/* Section 1: Conectar Redes Sociales */}
            <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-6">
                <div className="flex items-center space-x-3">
                  <UserGroupIcon className="h-8 w-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">
                    Cómo conectar tus redes sociales
                  </h2>
                </div>
              </div>

              <div className="px-8 py-8">
                <p className="text-gray-700 text-lg leading-relaxed mb-8">
                  Para poder hacer publicaciones en Instagram y LinkedIn primero
                  necesitas conectar tus cuentas de redes sociales a
                  mocklab.app. A continuación, unas consideraciones importantes:
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  {/* Instagram */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-3 h-3 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full mr-3"></span>
                      Instagram
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-gray-600 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">
                          La cuenta de Instagram debe ser una cuenta de empresa,
                          no personal ni de creador de contenido.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-gray-600 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">
                          Tu cuenta de Instagram debe estar vinculada a una
                          página de Facebook.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* LinkedIn */}
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 border border-gray-300">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-3 h-3 bg-gradient-to-r from-gray-700 to-gray-900 rounded-full mr-3"></span>
                      LinkedIn
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-gray-600 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">
                          Solo puedes conectar páginas de empresa, no perfiles
                          personales.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-gray-600 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">
                          La persona que conecta la página debe tener permiso de
                          publicación en dicha página.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Tip */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <LightBulbIcon className="h-6 w-6 text-gray-600 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Consejo:
                      </h4>
                      <p className="text-gray-700">
                        Antes de intentar conectar las cuentas, comprueba que
                        cumples todos estos requisitos en cada red.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: GPTs Personalizados */}
            <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-8 py-6">
                <div className="flex items-center space-x-3">
                  <CogIcon className="h-8 w-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">
                    Qué son los GPTs personalizados y cómo funcionan en
                    mocklab.app
                  </h2>
                </div>
              </div>

              <div className="px-8 py-8">
                <p className="text-gray-700 text-lg leading-relaxed mb-8">
                  Los GPTs personalizados (basados en OpenAI) en mocklab.app son
                  herramientas que te permiten transformar el contenido en bruto
                  de tu proyecto en textos listos para redes sociales.
                </p>

                {/* Cómo funcionan */}
                <div className="mb-12">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                    Cómo funcionan
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center font-bold mr-4">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Localiza la opción en el menú
                        </h4>
                        <p className="text-gray-700">
                          Con la sesión iniciada, en la barra superior verás la
                          opción "Mis GPTs", accede a ella y verás la opción
                          "Añadir GPT".
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center font-bold mr-4">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Crear tu GPT personalizado
                        </h4>
                        <p className="text-gray-700 mb-3">
                          Al pulsar "Añadir GPT" se te abrirá una ventana en la
                          que verás dos campos:
                        </p>
                        <ul className="space-y-2 ml-4">
                          <li className="text-gray-700">
                            <strong>Título del GPT:</strong> Ponle un nombre que
                            te ayude a recordar su función.
                          </li>
                          <li className="text-gray-700">
                            <strong>Descripción del GPT:</strong> Aquí debes
                            incluir el prompt con la descripción de la tarea que
                            llevará a cabo este agente de IA.
                          </li>
                        </ul>
                        <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
                          <p className="text-gray-800 text-sm">
                            <strong>Recomendación:</strong> Lee esta breve guía
                            de "Cómo elaborar un buen prompt para publicaciones
                            de arquitectura en RRSS" (puedes ayudarte de ChatGPT
                            o Gemini para crearlo).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Usar mi GPT personalizado */}
                <div className="mb-12">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                    Usar mi GPT personalizado
                  </h3>
                  <p className="text-gray-700 mb-6">
                    Para usar tu GPT personalizado tendrás primero que crear un
                    proyecto.
                  </p>

                  <div className="space-y-6">
                    <div className="flex items-start p-4 bg-gray-100 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Crea un proyecto
                        </h4>
                        <p className="text-gray-700">
                          En la barra superior selecciona la opción "Proyectos".
                          Verás la opción "Crear", selecciona para que se abra
                          el formulario del proyecto.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start p-4 bg-gray-100 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Rellena la información del proyecto
                        </h4>
                        <p className="text-gray-700">
                          Con el formulario abierto rellena los campos. En el
                          campo descripción puedes añadir el texto en bruto de
                          tu proyecto. Todos los datos del formulario le valdrán
                          a la IA para generar el contenido que necesites.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start p-4 bg-gray-100 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Selecciona tu GPT personalizado
                        </h4>
                        <p className="text-gray-700">
                          Dentro del formulario verás una casilla para marcar
                          que indica: "¿Quieres usar IA para este proyecto?
                          Marca sí para activar". Una vez marques esta casilla
                          podrás seleccionar el GPT personalizado que hayas
                          creado previamente.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start p-4 bg-gray-100 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Lanza tu proyecto
                        </h4>
                        <p className="text-gray-700">
                          Cuando lances tu proyecto el GPT personalizado cogerá
                          la información y trabajará en ella para proponerte la
                          publicación que quieras. Y esto podrás verlo en la
                          opción del menú superior llamada "Publicaciones".
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Beneficios */}
                <div className="mb-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                    Beneficios de usar GPTs personalizados
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        ⚡ Ahorra tiempo
                      </h4>
                      <p className="text-gray-700 text-sm">
                        Genera textos listos para publicación en segundos.
                      </p>
                    </div>
                    <div className="bg-gray-100 p-6 rounded-xl border border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        🎯 Sé coherente
                      </h4>
                      <p className="text-gray-700 text-sm">
                        Mantiene un estilo profesional y uniforme en todas tus
                        publicaciones.
                      </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        🔄 Obtén flexibilidad
                      </h4>
                      <p className="text-gray-700 text-sm">
                        Puedes crear los GPTs personalizados que necesites hasta
                        un límite de X.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tip */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <LightBulbIcon className="h-6 w-6 text-gray-600 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Consejo:
                      </h4>
                      <p className="text-gray-700">
                        Cuanto más completo y detallado sea tu contenido en
                        bruto y tu prompt, más preciso y útil será el texto
                        generado por el GPT.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Cómo elaborar un buen prompt */}
            <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-8 py-6">
                <div className="flex items-center space-x-3">
                  <LightBulbIcon className="h-8 w-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">
                    Cómo elaborar un buen prompt para publicaciones de
                    arquitectura en RRSS
                  </h2>
                </div>
              </div>

              <div className="px-8 py-8">
                <p className="text-gray-700 text-lg leading-relaxed mb-8">
                  Un prompt bien escrito es la clave para que tu GPT
                  personalizado (basados en OpenAI) genere textos claros,
                  atractivos y profesionales. Aquí tienes los puntos esenciales:
                </p>

                <div className="space-y-8">
                  {/* Punto 1 */}
                  <div className="border-l-4 border-gray-500 pl-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      1. Sé específico sobre el formato y el objetivo
                    </h3>
                    <ul className="space-y-2 mb-4">
                      <li className="text-gray-700">
                        • Indica si quieres un texto para Instagram, LinkedIn o
                        la Guía de Arquitectura.
                      </li>
                      <li className="text-gray-700">
                        • Define el objetivo: dar visibilidad, explicar un
                        proyecto, destacar al autor, etc.
                      </li>
                    </ul>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Ejemplo:</strong> "Redacta un texto de 80-100
                        palabras para Instagram sobre este proyecto, destacando
                        su integración en el entorno y la calidad de los
                        materiales."
                      </p>
                    </div>
                  </div>

                  {/* Punto 2 */}
                  <div className="border-l-4 border-gray-600 pl-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      2. Describe el contenido en bruto
                    </h3>
                    <ul className="space-y-2">
                      <li className="text-gray-700">
                        • Incluye toda la información importante en el
                        formulario del proyecto: nombre, ubicación,
                        características, conceptos de diseño, imágenes
                        disponibles, etc.
                      </li>
                      <li className="text-gray-700">
                        • Cuanto más completo sea el contenido, más preciso será
                        el resultado.
                      </li>
                    </ul>
                  </div>

                  {/* Punto 3 */}
                  <div className="border-l-4 border-gray-500 pl-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      3. Especifica el tono y estilo
                    </h3>
                    <ul className="space-y-2 mb-4">
                      <li className="text-gray-700">
                        • Decide si quieres que el texto sea informativo,
                        profesional, cercano, provocador, creativo, etc.
                      </li>
                      <li className="text-gray-700">
                        • Esto ayuda a que el GPT adapte la redacción al público
                        correcto.
                      </li>
                    </ul>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Ejemplo:</strong> "El tono debe ser profesional
                        pero cercano, resaltando el valor arquitectónico y la
                        innovación del proyecto."
                      </p>
                    </div>
                  </div>

                  {/* Punto 4 */}
                  <div className="border-l-4 border-gray-600 pl-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      4. Añade instrucciones sobre la extensión o formato
                    </h3>
                    <p className="text-gray-700 mb-4">
                      Puedes indicar el número de caracteres, párrafos, uso de
                      emojis, hashtags, etc.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Ejemplo:</strong> "Haz un texto de máximo 150
                        palabras, incluye 3 hashtags relevantes y un emoji de
                        ubicación."
                      </p>
                    </div>
                  </div>

                  {/* Punto 5 */}
                  <div className="border-l-4 border-gray-700 pl-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      5. Incluye criterios de relevancia
                    </h3>
                    <ul className="space-y-2">
                      <li className="text-gray-700">
                        • Si quieres que destaque ciertos aspectos: autor,
                        fotógrafo, impacto urbano, materiales, reconocimiento de
                        calidad, etc.
                      </li>
                      <li className="text-gray-700">
                        • Esto asegura que la publicación destaque lo más
                        importante del proyecto.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Final Tip */}
                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <LightBulbIcon className="h-6 w-6 text-gray-600 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Consejo:
                      </h4>
                      <p className="text-gray-700">
                        Prueba y ajusta tu prompt. Los GPTs trabajan mejor
                        cuanto más claras y detalladas sean las indicaciones. Si
                        algo no queda como quieres, modifica el prompt y vuelve
                        a generar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};
