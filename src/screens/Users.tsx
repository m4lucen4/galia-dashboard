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

export const Users = () => {
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
        first_name: formData.first_name,
        last_name: formData.last_name,
        active: formData.active,
        phone: formData.phone,
        company: formData.company,
        vat: formData.vat,
        role: formData.role,
      };

      dispatch(updateUser(updateData))
        .unwrap()
        .then(() => {
          // Cuando la actualización sea exitosa, refrescamos la lista de usuarios
          dispatch(fetchUsers());
          setDrawerOpen(false);
        })
        .catch((error) => {
          console.error("Error al actualizar el usuario:", error);
          // El mensaje de error se mostrará a través del estado de Redux
        });
    } else {
      // Modo creación - usamos la acción addUser existente
      dispatch(addUser(formData))
        .unwrap()
        .then(() => {
          dispatch(fetchUsers());
          setDrawerOpen(false);
        })
        .catch((error) => {
          console.error("Error al crear el usuario:", error);
        });
    }
  };

  const getFormData = () => {
    if (!userData) return undefined;

    return {
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      password: "",
      active: userData.active,
      phone: userData.phone || "",
      company: userData.company || "",
      vat: userData.vat || "",
      role: userData.role,
    };
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <Button title="Create User" onClick={handleOpenDrawer} />
      <Drawer
        title={isEditMode ? "Edit User" : "Create User"}
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
