import { useEffect, useMemo, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import {
  addUser,
  fetchUsers,
  updateUser,
  UpdateUserProps,
  CreateUserProps,
} from "../../../redux/actions/UserActions";
import { UsersTable } from "../components/UsersTable";
import { Drawer } from "../../../components/shared/ui/Drawer";
import { UsersForm } from "../components/UsersForm";
import { Alert } from "../../../components/shared/ui/Alert";
import { clearErrors } from "../../../redux/slices/UserSlice";
import { PillButton } from "@/components/shared/ui/PillButton";
import { SearchForm } from "@/components/shared/ui/SearchForm";
import { PlusIcon } from "@heroicons/react/24/outline";
import { errorMessages } from "../../../helpers";
import { useTranslation } from "react-i18next";

export const Users = () => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageResetKey, setPageResetKey] = useState(0);
  const dispatch = useAppDispatch();
  const {
    userAddRequest,
    users,
    userFetchRequest,
    userData,
    userFetchByUidRequest,
    userUpdateRequest,
  } = useAppSelector((state: RootState) => state.user);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
      return [fullName, user.email, user.company].some((value) =>
        value?.toLocaleLowerCase().includes(query),
      );
    });
  }, [users, searchQuery]);

  const errorMessage = errorMessages({
    addError: userAddRequest.messages,
    fetchError: userFetchRequest.messages,
    fetchByUidError: userFetchByUidRequest.messages,
    updateError: userUpdateRequest?.messages,
  });

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleOpenDrawer = () => {
    setIsEditMode(false);
    setDrawerOpen(true);
  };

  const handleEditUser = () => {
    setIsEditMode(true);
    setDrawerOpen(true);
  };

  const handleUserSubmit = (formData: CreateUserProps) => {
    if (isEditMode && userData) {
      const updateData: UpdateUserProps = {
        id: userData.id,
        uid: userData.uid,
        avatar_url: formData.avatar_url,
        first_name: formData.first_name,
        last_name: formData.last_name,
        active: formData.active,
        phone: formData.phone,
        company: formData.company,
        vat: formData.vat,
        description: formData.description,
        role: formData.role,
        address: formData.address,
        postal_code: formData.postal_code,
        city: formData.city,
        province: formData.province,
        province_id: formData.province_id ?? null,
        country: formData.country ?? null,
        job_position: formData.job_position,
        web: formData.web,
        tags: formData.tags,
        odoo_id: formData.odoo_id,
        folder_nas: formData.folder_nas,
        has_web: formData.has_web,
      };

      dispatch(updateUser(updateData))
        .unwrap()
        .then(() => {
          dispatch(fetchUsers());
          setDrawerOpen(false);
        });
    } else {
      dispatch(addUser(formData))
        .unwrap()
        .then(() => {
          setPageResetKey((key) => key + 1);
          dispatch(fetchUsers());
          setDrawerOpen(false);
        });
    }
  };

  const getFormData = () => {
    if (!userData) return undefined;

    return {
      avatar_url: userData.avatar_url || "",
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      password: "",
      active: userData.active,
      phone: userData.phone || "",
      company: userData.company || "",
      description: userData.description || "",
      vat: userData.vat || "",
      role: userData.role,
      address: userData.address || "",
      postal_code: userData.postal_code || "",
      city: userData.city || "",
      province: userData.province || "",
      province_id: userData.province_id ?? null,
      country: userData.country ?? null,
      job_position: userData.job_position || "",
      web: userData.web || "",
      tags: userData.tags || "",
      odoo_id: userData.odoo_id,
      folder_nas: userData.folder_nas || "",
      has_web: userData.has_web ?? false,
    };
  };

  return (
    <div className="min-w-0 space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#010000]/15 pb-8">
        <div className="min-w-0 space-y-3">
          <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
            {t("users.title")}
          </h1>
          <p className="text-base leading-relaxed text-[#010000]/65">
            {t("users.description")}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
          <SearchForm
            label={t("users.searchLabel")}
            placeholder={t("users.searchPlaceholder")}
            buttonLabel={t("shared.search")}
            clearLabel={t("shared.clearSearch")}
            onSearch={setSearchQuery}
            className="w-full sm:w-auto"
          />
          <PillButton onClick={handleOpenDrawer} className="shrink-0">
            <PlusIcon className="size-4 shrink-0" aria-hidden="true" />
            {t("users.createUser")}
          </PillButton>
        </div>
      </header>
      <Drawer
        variant="dashboard"
        closeLabel={t("users.closeForm")}
        title={isEditMode ? t("users.editUser") : t("users.createUser")}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <UsersForm
          initialData={isEditMode ? getFormData() : undefined}
          onSubmit={handleUserSubmit}
          loading={userAddRequest.inProgress}
          isEditMode={isEditMode}
          isAdmin
        />
      </Drawer>
      <UsersTable
        users={filteredUsers}
        searchQuery={searchQuery}
        pageResetKey={pageResetKey}
        emptyMessage={searchQuery ? t("users.noSearchResults") : undefined}
        isLoading={userFetchRequest.inProgress}
        onEditUser={handleEditUser}
      />
      {errorMessage && (
        <Alert
          title="Error"
          description={errorMessage}
          onAccept={() => dispatch(clearErrors())}
        />
      )}
    </div>
  );
};
