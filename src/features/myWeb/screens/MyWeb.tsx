import React, { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import {
  fetchSite,
  createSite,
} from "../../../redux/actions/SiteActions";
import { initDefaultPages } from "../../../redux/actions/SitePageActions";
import { SiteConfigForm, SiteConfigFormHandle } from "../components/SiteConfigForm";
import { PageList } from "../components/PageList";
import { PublishButton } from "../components/PublishButton";
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
      .replaceAll(/[\u0300-\u036f]/g, "")
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
            disabled={
              saveRequest.inProgress || !studioName || !slug
            }
          />

          {saveRequest.messages && !saveRequest.ok && (
            <p className="text-sm text-red-600">{saveRequest.messages}</p>
          )}
        </div>
      </div>
    );
  }

  // Site exists — show config + pages (two columns)
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base/7 font-semibold text-gray-900">Mi Web</h3>
      </div>

      <PublishButton
        site={site}
        onSave={() => configFormRef.current?.save()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="space-y-6">
          <SiteConfigForm ref={configFormRef} site={site} />
        </div>

        <div className="space-y-6">
          <PageList pages={pages} />
        </div>
      </div>
    </div>
  );
};
