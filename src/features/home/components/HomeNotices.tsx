import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

export const HomeNotices = ({ hasError, showSubscriptionBanner }: { hasError: boolean; showSubscriptionBanner: boolean }) => (
  <>
    {hasError && (
      <div role="alert" className="flex items-start gap-3 rounded-3xl border border-[#010000]/20 bg-[#ff522a]/15 p-5">
        <ExclamationTriangleIcon className="size-5 shrink-0" aria-hidden="true" />
        <p>Error al cargar los proyectos. Por favor, intenta recargar la página.</p>
      </div>
    )}
    {showSubscriptionBanner && (
      <div role="status" className="flex flex-wrap items-start gap-3 rounded-3xl bg-[#fbea71] p-5">
        <ExclamationTriangleIcon className="size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Tu suscripción a Mocklab no está activa.</p>
          <p className="mt-1">Para seguir disfrutando de todas las funcionalidades premium, por favor regulariza tu suscripción desde los ajustes de tu cuenta.</p>
        </div>
        <Link to="/settings" className="rounded-full text-sm font-medium underline underline-offset-4">Ir a Ajustes</Link>
      </div>
    )}
  </>
);
