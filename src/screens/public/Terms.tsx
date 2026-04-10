import { useNavigate } from "react-router-dom";
import { Button } from "../../components/shared/ui/Button";

export const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900 mb-4">
        CONTRATO DE ADHESIÓN Y TÉRMINOS DE SUSCRIPCIÓN PARA EL USO DE LA
        PLATAFORMA MOCKLAB.APP
      </h3>
      <Button title="Volver" onClick={() => navigate("/")} />
      <div className="space-y-6 mt-8 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            1. Partes contratantes
          </h2>
          <p>
            De una parte, <strong>MOCKLAB MEDIA S.L.</strong>, con NIF
            B90271891, domicilio en Calle Arroyo 52, local 2, 41008 Sevilla, y
            correo electrónico hola@nachovillegas.com (en adelante, "el
            Proveedor" o "mocklab"). De otra parte, los datos de la persona
            física o jurídica indicados en el Formulario de Suscripción adjunto
            (en adelante, "el Suscriptor" o "el Usuario").
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            2. Objeto del contrato
          </h2>
          <p>
            El presente contrato rige los términos y condiciones de la
            suscripción mediante la cual mocklab proporciona al Suscriptor
            acceso a la plataforma mocklab.app (en adelante, "la Aplicación"),
            una herramienta tecnológica (Software as a Service) diseñada para la
            gestión, organización y publicación de contenido fotográfico y
            documental especializado en arquitectura en las redes sociales y
            canales digitales propios del Suscriptor. Mocklab trabaja de forma
            continua en la evolución de la plataforma. El Suscriptor podrá
            beneficiarse de las mejoras y actualizaciones que se vayan
            incorporando durante la vigencia de su suscripción, sin coste
            adicional salvo que se indique expresamente lo contrario.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            3. Uso de Inteligencia Artificial (IA) y servicios de terceros
          </h2>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            3.1. Tecnología empleada
          </h3>
          <p>
            La plataforma mocklab.app utiliza tecnología de Inteligencia
            Artificial para optimizar la gestión, organización y publicación del
            contenido del Suscriptor. Actualmente, mocklab se conecta mediante
            API a los modelos de lenguaje de Google Gemini. mocklab podrá
            incorporar o sustituir proveedores de IA en el futuro, actualizando
            en todo caso su Política de Privacidad y los avisos legales
            correspondientes.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            3.2. Alcance del procesamiento
          </h3>
          <p>
            El procesamiento mediante IA se limita estrictamente a la
            información textual y documental introducida por el Suscriptor con
            el fin de generar borradores, organizar reportajes y facilitar la
            publicación en canales digitales. En ningún caso se utilizará el
            contenido del Suscriptor para entrenar modelos de inteligencia
            artificial, propios ni de terceros.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            3.3. Responsabilidad sobre el resultado
          </h3>
          <p>
            Los contenidos generados por IA tienen carácter de borrador y
            constituyen una herramienta de apoyo a la actividad del Suscriptor.
            mocklab no garantiza la exactitud, idoneidad o adecuación de dichos
            borradores al uso final previsto. El Suscriptor es responsable de
            revisar y validar todo contenido antes de su publicación.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            3.4. Retención de datos por proveedores de IA
          </h3>
          <p>
            mocklab informará al Suscriptor, a través de su Política de
            Privacidad y de los avisos correspondientes, sobre las condiciones
            de tratamiento y retención de datos aplicadas por los proveedores de
            IA utilizados, así como sobre cualquier transferencia internacional
            de datos que pudiera derivarse de dicho procesamiento.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            3.5. Opción de uso sin procesamiento por IA
          </h3>
          <p>
            El Suscriptor que prefiera no utilizar las funcionalidades basadas
            en IA podrá desactivarlas desde la configuración de su cuenta. En
            tal caso, determinadas funcionalidades de la plataforma estarán
            limitadas o no disponibles, lo que se indicará claramente en la
            interfaz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            4. Protección del contenido y propiedad intelectual
          </h2>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            4.1. Titularidad del Suscriptor
          </h3>
          <p>
            El Suscriptor conserva en todo momento la plena titularidad de todos
            los derechos de propiedad intelectual e industrial sobre las
            fotografías, textos y proyectos que suba a la plataforma. mocklab no
            adquiere ningún derecho de propiedad sobre dicho contenido, ni lo
            cederá a terceros para ningún fin distinto de la prestación del
            servicio contratado.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            4.2. Licencia operativa
          </h3>
          <p>
            El Suscriptor otorga a mocklab una licencia de uso estrictamente
            técnica, limitada, no exclusiva y temporal, con el único fin de
            alojar, procesar, adaptar técnicamente y transmitir el contenido a
            las redes sociales y canales digitales conectados por el propio
            Suscriptor. Esta licencia se extingue automáticamente en el momento
            en que el Suscriptor cancele su suscripción.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            4.3. Eliminación del contenido tras la cancelación
          </h3>
          <p>
            Una vez cancelada la suscripción, el Suscriptor podrá solicitar la
            exportación de su contenido en formato estándar antes de la fecha de
            baja efectiva. Transcurridos 30 días desde dicha fecha, mocklab
            procederá a la eliminación definitiva del contenido del Suscriptor
            de sus sistemas, salvo obligación legal en contrario.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            4.4. Protección frente al uso no autorizado (Anti-Scraping)
          </h3>
          <p>
            mocklab garantiza que los archivos alojados en el espacio privado
            del Suscriptor no serán indexados, comercializados, compartidos con
            terceros ni utilizados para entrenar modelos de inteligencia
            artificial, propios ni ajenos. El entorno de gestión del Suscriptor
            es estrictamente privado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            5. Responsabilidad exclusiva sobre el material publicado
          </h2>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            5.1. Rol de mocklab
          </h3>
          <p>
            mocklab actúa como proveedor de herramientas tecnológicas para la
            gestión y publicación de contenido. La responsabilidad editorial
            sobre el material publicado a través de la plataforma recae en todo
            caso sobre el Suscriptor, con independencia del grado de
            automatización utilizado en el proceso de publicación.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            5.2. Responsabilidad del Suscriptor
          </h3>
          <p>
            Al subir y publicar material a través de mocklab.app, el Suscriptor
            confirma y asume la responsabilidad de que:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              Es titular legítimo de los derechos de autor de las fotografías y
              textos, o cuenta con autorización expresa del autor para su uso en
              redes sociales y canales digitales.
            </li>
            <li>
              Dispone de los consentimientos necesarios en materia de derechos
              de imagen de las personas que pudieran aparecer en el contenido,
              así como de las autorizaciones pertinentes para la reproducción de
              espacios privados.
            </li>
            <li>
              El material publicado no es difamatorio, ilícito, ni vulnera
              derechos al honor, a la intimidad ni secretos comerciales de
              terceros.
            </li>
          </ul>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            5.3. Responsabilidad de mocklab frente al Suscriptor
          </h3>
          <p>
            mocklab responderá ante el Suscriptor por los daños directos
            causados por fallos graves de la plataforma imputables
            exclusivamente al proveedor. En todo caso, la responsabilidad máxima
            de mocklab quedará limitada al importe de las cuotas abonadas por el
            Suscriptor durante los tres meses anteriores al incidente.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            5.4. Reclamaciones de terceros
          </h3>
          <p>
            Si como consecuencia del contenido gestionado o publicado por el
            Suscriptor a través de la plataforma se derivara alguna reclamación,
            demanda o sanción contra MOCKLAB MEDIA S.L. por parte de terceros,
            el Suscriptor asumirá los costes legales razonables y debidamente
            acreditados que dicha reclamación ocasione al proveedor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            6. Disponibilidad del servicio y copias de seguridad
          </h2>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            6.1. Disponibilidad del servicio
          </h3>
          <p>
            mocklab adopta las medidas técnicas razonables para mantener la
            plataforma operativa y minimizar las interrupciones del servicio. No
            obstante, no garantiza una disponibilidad ininterrumpida, pudiendo
            producirse cortes por causas técnicas, de mantenimiento o ajenas al
            proveedor.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            6.2. Mantenimientos programados
          </h3>
          <p>
            mocklab procurará realizar las tareas de mantenimiento planificado
            en franjas horarias de baja actividad, notificando al Suscriptor
            mediante aviso en la propia plataforma.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            6.3. Incidencias no planificadas
          </h3>
          <p>
            Ante caídas o interrupciones no previstas, mocklab se compromete a
            comunicar la incidencia con la mayor brevedad posible e informar
            sobre el estado de resolución a través de los canales habituales de
            soporte.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            6.4. Copias de seguridad
          </h3>
          <p>
            mocklab realiza copias de seguridad periódicas de la infraestructura
            de la plataforma con fines operativos propios. No obstante, la
            plataforma no es un servicio de almacenamiento masivo. El Suscriptor
            es responsable de mantener copias de seguridad de su material
            original en sus propios sistemas, y no podrá exigir a mocklab la
            recuperación de contenido perdido por causas ajenas a un fallo grave
            e imputable al proveedor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            7. Condiciones y política de pagos
          </h2>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            7.1. Modalidades de suscripción
          </h3>
          <p>mocklab ofrece las siguientes modalidades de suscripción:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              <strong>Suscripción mensual:</strong> facturada y cobrada de forma
              recurrente cada mes natural desde la fecha de activación.
            </li>
            <li>
              <strong>Suscripción anual:</strong> facturada y cobrada de forma
              recurrente cada doce meses desde la fecha de activación.
            </li>
          </ul>
          <p className="mt-2">
            Las tarifas vigentes para cada modalidad estarán publicadas de forma
            visible en la plataforma mocklab.app. Todos los precios se expresan
            en euros (€) y se entienden con el IVA incluido o desglosado según
            se indique en cada caso.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            7.2. Métodos de pago aceptados
          </h3>
          <p>
            El cobro de las suscripciones se gestiona a través de la pasarela de
            pago Stripe. Los métodos de pago aceptados son los habilitados por
            dicha pasarela en cada momento, que pueden incluir tarjetas de
            crédito, tarjetas de débito y otros medios electrónicos de pago. El
            Suscriptor es responsable de mantener actualizados sus datos de pago
            en su cuenta. mocklab no almacena directamente datos de tarjetas ni
            información financiera sensible del Suscriptor, siendo Stripe el
            único responsable de la custodia de dichos datos conforme a la
            normativa PCI-DSS.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            7.3. Facturación y plazos
          </h3>
          <p>
            La facturación se realizará de forma anticipada al inicio de cada
            período de suscripción, ya sea mensual o anual. mocklab emitirá la
            correspondiente factura electrónica, que estará disponible para el
            Suscriptor en su área de cuenta o será enviada al correo electrónico
            facilitado. La primera factura se generará en el momento de la
            activación de la suscripción, y las sucesivas en la fecha de
            renovación correspondiente.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            7.4. Renovación automática
          </h3>
          <p>
            La suscripción se renovará automáticamente al finalizar cada período
            contratado, salvo que el Suscriptor cancele antes del vencimiento
            del período en curso, conforme a lo previsto en la cláusula 9.2 del
            presente contrato. El cargo correspondiente al nuevo período se
            realizará el mismo día de la renovación.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            7.5. Impagos y consecuencias
          </h3>
          <p>
            En caso de que el cobro de una cuota no pueda realizarse por
            cualquier causa imputable al Suscriptor (fondos insuficientes,
            tarjeta caducada, rechazo de la entidad financiera, etc.), mocklab:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              Notificará al Suscriptor del impago a través del correo electrónico
              registrado en su cuenta.
            </li>
            <li>
              Concederá un plazo de gracia de 7 días naturales desde la
              notificación para regularizar el pago actualizando el método de
              pago o abonando manualmente la cuota pendiente.
            </li>
            <li>
              Transcurrido el plazo de gracia sin que se haya regularizado el
              pago, mocklab podrá suspender temporalmente el acceso a la
              plataforma. Durante la suspensión, el contenido del Suscriptor se
              conservará en los servidores de mocklab.
            </li>
            <li>
              Si el impago persiste durante 30 días naturales adicionales desde
              la suspensión, mocklab podrá resolver el contrato y proceder a la
              eliminación del contenido conforme a la cláusula 4.3, previa
              notificación al Suscriptor con un mínimo de 15 días de antelación.
            </li>
          </ul>
          <p className="mt-2">
            mocklab se reserva el derecho de reclamar las cantidades pendientes
            de pago, así como los intereses de demora legalmente aplicables y,
            en su caso, los gastos de gestión de cobro razonables y debidamente
            justificados.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            7.6. Política de reembolsos
          </h3>
          <p>
            Con carácter general, las cuotas abonadas no son reembolsables. La
            cancelación de la suscripción por parte del Suscriptor surtirá
            efecto al final del período en curso ya abonado, manteniéndose el
            acceso hasta dicha fecha. No obstante, el Suscriptor tendrá derecho
            al reembolso proporcional del período no disfrutado en los
            siguientes supuestos:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              Incumplimiento grave del servicio imputable a mocklab que haya
              sido comunicado y no subsanado en un plazo razonable.
            </li>
            <li>
              Modificación sustancial de las condiciones del contrato o de las
              tarifas por parte de mocklab que motive la cancelación del
              Suscriptor dentro del plazo previsto en la cláusula 9.3.
            </li>
          </ul>
          <p className="mt-2">
            Las solicitudes de reembolso deberán dirigirse a
            hola@nachovillegas.com en un plazo máximo de 30 días desde el hecho
            que las motive. mocklab resolverá cada solicitud en un plazo máximo
            de 15 días hábiles.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            7.7. Modificación de tarifas
          </h3>
          <p>
            mocklab podrá modificar las tarifas vigentes, notificándolo al
            Suscriptor con un mínimo de 30 días naturales de antelación. El
            nuevo precio se aplicará a partir de la siguiente renovación
            posterior a la comunicación. Si el Suscriptor no está de acuerdo con
            la nueva tarifa, podrá cancelar su suscripción antes de la fecha de
            renovación sin penalización alguna.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            7.8. Impuestos y obligaciones fiscales
          </h3>
          <p>
            Las tarifas publicadas incluyen el Impuesto sobre el Valor Añadido
            (IVA) aplicable en España, salvo que se indique expresamente lo
            contrario. Para Suscriptores con domicilio fiscal fuera de España, se
            aplicarán las normas de tributación correspondientes según la
            normativa europea e internacional vigente. El Suscriptor es
            responsable de facilitar datos fiscales correctos y actualizados para
            la emisión de facturas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            8. Protección de datos personales
          </h2>
          <p>
            De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley
            Orgánica 3/2018 (LOPDGDD), se informa al Suscriptor de lo siguiente:
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            8.1. Responsable del tratamiento
          </h3>
          <p>
            MOCKLAB MEDIA S.L., con NIF B90271891 y domicilio en Calle Arroyo
            52, local 2, 41008 Sevilla. Contacto: hola@nachovillegas.com.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            8.2. Finalidad
          </h3>
          <p>
            Gestionar la suscripción y el acceso a la plataforma mocklab.app,
            así como la comunicación e información relacionada con el servicio.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            8.3. Base jurídica
          </h3>
          <p>
            La ejecución del presente contrato de suscripción y, en su caso, el
            consentimiento expreso del Suscriptor para el envío de comunicaciones
            informativas.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            8.4. Encargados del tratamiento
          </h3>
          <p>
            Para la prestación del servicio, mocklab cuenta con los siguientes
            encargados del tratamiento, con quienes tiene suscritos los
            correspondientes contratos de encargo conforme al art. 28 RGPD:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              <strong>Supabase:</strong> infraestructura técnica, backend y
              autenticación.
            </li>
            <li>
              <strong>Odoo:</strong> gestión interna y facturación.
            </li>
            <li>
              <strong>Stripe:</strong> gestión de pagos y suscripciones.
            </li>
          </ul>
          <p className="mt-2">
            Estos proveedores únicamente tratarán los datos conforme a las
            instrucciones de mocklab y para las finalidades descritas, sin poder
            utilizarlos para fines propios.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            8.5. Transferencias internacionales
          </h3>
          <p>
            Algunos de los proveedores indicados pueden estar ubicados o tener
            servidores fuera del Espacio Económico Europeo. En tal caso, mocklab
            garantiza que dichas transferencias se realizan bajo mecanismos
            legalmente reconocidos, como las Cláusulas Contractuales Tipo
            aprobadas por la Comisión Europea. El Suscriptor puede solicitar
            información detallada sobre estas garantías escribiendo a
            hola@nachovillegas.com.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            8.6. Derechos del Suscriptor
          </h3>
          <p>
            El Suscriptor puede ejercer en cualquier momento sus derechos de
            acceso, rectificación, supresión, limitación, oposición y
            portabilidad escribiendo a hola@nachovillegas.com. Asimismo, tiene
            derecho a presentar una reclamación ante la Agencia Española de
            Protección de Datos (www.aepd.es) si considera que el tratamiento de
            sus datos no se ajusta a la normativa vigente.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            8.7. Información adicional
          </h3>
          <p>
            Para más información sobre el tratamiento de datos personales, el
            Suscriptor puede consultar la Política de Privacidad disponible en
            www.mocklab.app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            9. Duración, resolución y ley aplicable
          </h2>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            9.1. Entrada en vigor y duración
          </h3>
          <p>
            El presente contrato entrará en vigor en el momento de su aceptación
            y el abono de la primera cuota, manteniéndose vigente durante el
            período contratado y renovándose automáticamente por períodos
            equivalentes salvo que cualquiera de las partes comunique su voluntad
            de no renovar antes del vencimiento.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            9.2. Cancelación por el Suscriptor
          </h3>
          <p>
            El Suscriptor podrá cancelar su suscripción en cualquier momento
            desde la configuración de su cuenta, con efecto al final del período
            en curso. mocklab no reembolsará las cuotas del período ya abonado,
            salvo en los supuestos previstos en la cláusula 7.6 del presente
            contrato.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            9.3. Modificaciones del contrato y de las tarifas
          </h3>
          <p>
            mocklab podrá actualizar los presentes términos o modificar las
            tarifas vigentes, notificándolo al Suscriptor mediante aviso en la
            plataforma con un mínimo de 30 días de antelación. Si el Suscriptor
            no está de acuerdo con las modificaciones, podrá cancelar su
            suscripción antes de la fecha de entrada en vigor sin penalización
            alguna. La continuación del uso de la plataforma tras dicha fecha
            implicará la aceptación de las nuevas condiciones.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            9.4. Suspensión o cancelación por mocklab
          </h3>
          <p>
            mocklab se reserva el derecho de suspender o cancelar la cuenta del
            Suscriptor de forma inmediata en caso de uso ilícito, fraudulento o
            que vulnere derechos de propiedad intelectual de terceros a través de
            la plataforma. Fuera de estos supuestos, mocklab comunicará al
            Suscriptor cualquier decisión de cancelación con un mínimo de 30
            días de antelación.
          </p>
          <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">
            9.5. Ley aplicable y jurisdicción
          </h3>
          <p>
            El presente contrato se rige por la legislación española. Para
            cualquier controversia derivada de su interpretación o ejecución,
            las partes se someten expresamente a la jurisdicción de los Juzgados
            y Tribunales de Sevilla.
          </p>
        </section>
      </div>
    </div>
  );
};
