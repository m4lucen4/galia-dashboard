import { useLinkClickHandler } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks";
import { Button, ButtonLink } from "@/features/newWeb/components/ui/Button";

const sectionLinks = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#tu-web", label: "Tu web" },
  { href: "#precios", label: "Precios" },
  { href: "#faq", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
];

export const LandingNavigation = ({ homePath = "" }: { homePath?: string }) => {
  const { authenticated, checkAuthRequest, logoutRequest } = useAppSelector((state) => state.auth);
  const sessionUnknown = !authenticated && !checkAuthRequest.ok && !checkAuthRequest.messages && !logoutRequest.ok;
  const entryPath = authenticated ? "/home" : "/login";
  const handleEntryClick = useLinkClickHandler<HTMLAnchorElement>(entryPath);

  return (
    <nav
      className="flex items-center gap-2 max-[75rem]:in-[details]:absolute max-[75rem]:in-[details]:top-full max-[75rem]:in-[details]:right-(--new-web-gutter) max-[75rem]:in-[details]:z-20 max-[75rem]:in-[details]:grid max-[75rem]:in-[details]:w-[min(22rem,calc(100%-2*var(--new-web-gutter)))] max-[75rem]:in-[details]:gap-3 max-[75rem]:in-[details]:rounded-3xl max-[75rem]:in-[details]:border-[1.5px] max-[75rem]:in-[details]:border-solid max-[75rem]:in-[details]:border-[#010000] max-[75rem]:in-[details]:bg-[#d8e4d6] max-[75rem]:in-[details]:p-4"
      aria-label="Navegación principal"
    >
      {sectionLinks.map(({ href, label }) => (
        <ButtonLink key={href} href={`${homePath}${href}`} variant="outline">
          {label}
        </ButtonLink>
      ))}
      <ButtonLink href="/articulos" variant="outline">
        Artículos
      </ButtonLink>
      {sessionUnknown ? (
        <Button variant="text" disabled aria-busy={true}>Comprobando sesión…</Button>
      ) : (
        <ButtonLink href={entryPath} onClick={handleEntryClick} variant="text">
          {authenticated ? "Mi panel" : "Entrar"}
        </ButtonLink>
      )}
    </nav>
  );
};
