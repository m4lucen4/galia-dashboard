import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { checkAuthState } from "@/redux/actions/AuthActions";
import { Brand } from "@/features/newWeb/components/ui/Brand";
import { Container } from "@/features/newWeb/components/ui/Container";
import { LandingNavigation } from "@/features/newWeb/components/LandingNavigation";

export const LandingHeader = ({ homePath = "" }: { homePath?: string }) => {
  const dispatch = useAppDispatch();
  const { authenticated, checkAuthRequest, logoutRequest } = useAppSelector((state) => state.auth);
  const restorationStarted = useRef(false);
  const sessionUnknown = !authenticated && !checkAuthRequest.ok && !checkAuthRequest.messages && !logoutRequest.ok;

  useEffect(() => {
    if (!sessionUnknown || checkAuthRequest.inProgress || restorationStarted.current) return;
    restorationStarted.current = true;
    void dispatch(checkAuthState());
  }, [dispatch, sessionUnknown, checkAuthRequest.inProgress]);

  return (
    <header className="sticky top-0 z-40 bg-[#d8e4d6]">
      <Container className="flex min-h-20 items-center justify-between gap-8">
        <Brand />
        <div className="hidden min-[75rem]:block">
          <LandingNavigation homePath={homePath} />
        </div>
        <details className="block min-[75rem]:hidden [&:not([open])_nav]:hidden">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-[999px] border-[1.5px] border-solid border-[#010000] bg-transparent px-4.5 py-2.5 font-[inherit] text-[length:inherit] leading-tight text-center text-[#010000] no-underline hover:bg-[#010000] hover:text-[#d8e4d6] [&::-webkit-details-marker]:hidden">
            Menú
          </summary>
          <LandingNavigation homePath={homePath} />
        </details>
      </Container>
    </header>
  );
};
