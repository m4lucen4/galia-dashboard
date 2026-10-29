import React, { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { RootState } from "@/redux/store";
import { fetchSite, createSite } from "@/redux/actions/SiteActions";
import { initDefaultPages } from "@/redux/actions/SitePageActions";
import { SiteConfigForm, SiteConfigFormHandle } from "@/features/myWeb/components/SiteConfigForm";
import { PageEditor } from "@/features/myWeb/components/PageEditor";
import { PublishButton } from "@/features/myWeb/components/PublishButton";
import { MyWebTabBar } from "@/features/myWeb/components/MyWebTabBar";
import { SiteCreationForm } from "@/features/myWeb/components/SiteCreationForm";
import { myWebMutedClassName } from "@/features/myWeb/components/myWebStyles";

export const MyWeb: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { site, fetchRequest, saveRequest } = useAppSelector(
    (state: RootState) => state.site,
  );
  const { pages } = useAppSelector((state: RootState) => state.sitePage);

  const configFormRef = useRef<SiteConfigFormHandle>(null);
  const [activeTabId, setActiveTabId] = useState<string>("config");

  // Creation form state
  const [studioName, setStudioName] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchSite());
    }
  }, [dispatch, user?.uid]);

  useEffect(() => {
    if (site?.id) {
      dispatch(initDefaultPages(site.id));
    }
  }, [dispatch, site?.id]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replaceAll(/[̀-ͯ]/g, "")
      .replaceAll(/[^a-z0-9\s-]/g, "")
      .replaceAll(/\s+/g, "-")
      .replaceAll(/-+/g, "-")
      .replaceAll(/^-|-$/g, "");
  };

  const handleCreateSite = () => {
    if (!studioName || !slug) return;
    dispatch(createSite({ studio_name: studioName, slug }));
  };

  // Loading state
  if (fetchRequest.inProgress) {
    return (
      <div role="status" className="flex min-h-100 items-center justify-center gap-3 text-[#010000]">
        <div aria-hidden="true" className="size-8 animate-spin rounded-full border-b-2 border-[#010000]" />
        <span>Cargando tu web...</span>
      </div>
    );
  }

  // No site yet — show creation form
  if (!site) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6 py-4 text-[#010000] sm:py-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Mi Web</h1>
          <p className={myWebMutedClassName}>
            Configura tu web profesional. Empieza por darle un nombre a tu estudio.
          </p>
        </header>
        <SiteCreationForm
          studioName={studioName}
          slug={slug}
          inProgress={saveRequest.inProgress}
          errorMessage={!saveRequest.ok ? saveRequest.messages : undefined}
          onStudioNameChange={(value) => {
            setStudioName(value);
            setSlug(generateSlug(value));
          }}
          onSlugChange={setSlug}
          onCreate={handleCreateSite}
        />
      </div>
    );
  }

  const activePage = pages.find((p) => p.id === activeTabId);

  return (
    <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-col gap-6 text-[#010000]">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Mi Web</h1>
        <p className={myWebMutedClassName}>
          Personaliza tu estudio, organiza las páginas y prepara tu web para compartirla.
        </p>
      </header>
      <PublishButton
        site={site}
        onSave={() => configFormRef.current?.save()}
        showSave={activeTabId === "config"}
      />

      <MyWebTabBar
        pages={pages}
        siteId={site.id}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onPageCreated={setActiveTabId}
      />

      <div className="w-full min-w-0 pb-6">
        {activeTabId === "config" && (
          <SiteConfigForm ref={configFormRef} site={site} />
        )}
        {activePage && (
          <PageEditor key={activePage.id} page={activePage} />
        )}
      </div>
    </div>
  );
};
