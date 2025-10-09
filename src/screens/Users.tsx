import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { RootState } from "../redux/store";
import {
  addUser,
  fetchUsers,
  updateUser,
  UpdateUserProps,
} from "../redux/actions/UserActions";
import { CreateUserProps } from "../redux/actions/UserActions";
import { UsersTable } from "../components/users/UsersTable";
import { Drawer } from "../components/shared/ui/Drawer";
import { UsersForm } from "../components/users/UsersForm";
import { Alert } from "../components/shared/ui/Alert";
import { clearErrors } from "../redux/slices/UserSlice";
import { Button } from "../components/shared/ui/Button";
import { errorMessages } from "../helpers";
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
