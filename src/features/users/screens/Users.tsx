import { useEffect, useState } from "react";
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
import { Button } from "../../../components/shared/ui/Button";
import { errorMessages } from "../../../helpers";
import { useTranslation } from "react-i18next";

export const Users = () => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const dispatch = useAppDispatch();
  const {
    userAddRequest,
    users,
    userFetchRequest,
    userData,
    userFetchByUidRequest,
    userUpdateRequest,
  } = useAppSelector((state: RootState) => state.user);

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
        folder_nas: formData.folder_nas,
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
      folder_nas: userData.folder_nas || "",
    };
  };

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        {t("users.title")}
      </h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-7xl text-sm/6 text-gray-500">
          {t("users.description")}
        </p>
      </div>
      <Button title={t("users.createUser")} onClick={handleOpenDrawer} />
      <Drawer
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
        users={users}
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
