import React, { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { fetchSite, createSite } from "../../../redux/actions/SiteActions";
import { initDefaultPages } from "../../../redux/actions/SitePageActions";
import { SiteConfigForm, SiteConfigFormHandle } from "../components/SiteConfigForm";
import { PageEditor } from "../components/PageEditor";
import { PublishButton } from "../components/PublishButton";
import { MyWebTabBar } from "../components/MyWebTabBar";
import { InputField } from "../../../components/shared/ui/InputField";
import { Button } from "../../../components/shared/ui/Button";

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
      <div className="flex justify-center items-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  // No site yet — show creation form
  if (!site) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-black mb-2">Mi Web</h1>
        <p className="text-gray-600 mb-8">
          Configura tu web profesional. Empieza por darle un nombre a tu
          estudio.
        </p>

        <div className="space-y-4">
          <InputField
            label="Nombre del estudio"
            id="studio_name_create"
            type="text"
            value={studioName}
            onChange={(e) => {
              setStudioName(e.target.value);
              setSlug(generateSlug(e.target.value));
            }}
            required
            placeholder="Mi Estudio de Arquitectura"
          />

          <InputField
            label="Slug (URL de tu web)"
            id="slug_create"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            helperText="Solo letras minúsculas, números y guiones"
            placeholder="mi-estudio"
          />

          <Button
            title="Crear mi web"
            onClick={handleCreateSite}
            disabled={saveRequest.inProgress || !studioName || !slug}
          />

          {saveRequest.messages && !saveRequest.ok && (
            <p className="text-sm text-red-600">{saveRequest.messages}</p>
          )}
        </div>
      </div>
    );
  }

  const activePage = pages.find((p) => p.id === activeTabId);

  return (
    <div className="w-full flex flex-col min-h-0">
      <div className="px-4 pt-4 pb-3">
        <PublishButton
          site={site}
          onSave={() => configFormRef.current?.save()}
        />
      </div>

      <MyWebTabBar
        pages={pages}
        siteId={site.id}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onPageCreated={setActiveTabId}
      />

      <div className="w-full px-6 py-6">
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
