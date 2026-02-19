import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import {
  fetchUserByUid,
  UpdateUserProps,
} from "../../../redux/actions/UserActions";
import { Alert } from "../../../components/shared/ui/Alert";
import { clearErrors } from "../../../redux/slices/UserSlice";
import { LoadingSpinner } from "../../../components/shared/ui/LoadingSpinner";
import { useTranslation } from "react-i18next";
import { ChangePassword } from "../components/ChangePassword";
import { FormButtons } from "../components/FormButtons";
import { ProfileForm } from "../components/ProfileForm";
import { useProfileHandlers } from "../useProfileHandlers";

export const Profile = () => {
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { userData, userUpdateRequest, userFetchByUidRequest } = useAppSelector(
    (state: RootState) => state.user
  );
  const { changePasswordRequest } = useAppSelector(
    (state: RootState) => state.auth
  );
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState<UpdateUserProps | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const {
    passwordError,
    showPasswordAlert,
    newPassword,
    repeatPassword,
    handleChange,
    handlePasswordChange,
    handlePasswordAlertAccept,
    handleSubmit,
    handleCountryChange,
    handleLanguageChange,
    handleEdit,
    handleCancel,
    handleChangePassword,
    handlePasswordAlertCancel,
    avatarPreview,
    handleAvatarChange,
  } = useProfileHandlers({
    formData,
    setFormData,
    userData,
    setIsEditing,
    user,
  });

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchUserByUid(user.uid));
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (userData) {
      setFormData({
        id: userData.id,
        uid: userData.uid,
        avatar_url: userData.avatar_url || "",
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        phone: userData.phone || "",
        company: userData.company || "",
        vat: userData.vat || "",
        description: userData.description || "",
        active: userData.active,
        role: userData.role,
        password: "",
        language: userData.language || "",
        address: userData.address || "",
        postal_code: userData.postal_code || "",
        city: userData.city || "",
        province: userData.province || "",
        country: userData.country ?? null,
        job_position: userData.job_position || "",
        web: userData.web || "",
        tags: userData.tags || "",
      });
    }
  }, [userData]);

  if (userFetchByUidRequest?.inProgress) {
    return (
      <div className="container mx-auto p-4">
        <LoadingSpinner fullPage />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        {t("profile.title")}
      </h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
          {t("profile.description")}
        </p>
        <span
          className="text-sm/6 text-gray-500 hover:text-black cursor-pointer underline"
          onClick={handleChangePassword}
        >
          {t("profile.changePassword")}
        </span>
      </div>
      {formData && userData && (
        <div>
          <form onSubmit={handleSubmit}>
            <FormButtons
              isEditing={isEditing}
              isLoading={userUpdateRequest?.inProgress || false}
              onEdit={handleEdit}
              onCancel={handleCancel}
            />
            <ProfileForm
              formData={formData}
              userData={userData}
              isEditing={isEditing}
              onChange={handleChange}
              onCountryChange={handleCountryChange}
              onLanguageChange={handleLanguageChange}
              onAvatarChange={handleAvatarChange}
              avatarPreview={avatarPreview}
            />
          </form>
        </div>
      )}
      {userUpdateRequest?.messages && (
        <Alert
          title="Error"
          description={userUpdateRequest.messages}
          onAccept={() => dispatch(clearErrors())}
        />
      )}
      <ChangePassword
        isVisible={showPasswordAlert}
        newPassword={newPassword}
        repeatPassword={repeatPassword}
        passwordError={passwordError}
        isLoading={changePasswordRequest?.inProgress || false}
        onPasswordChange={handlePasswordChange}
        onAccept={handlePasswordAlertAccept}
        onCancel={handlePasswordAlertCancel}
      />
    </div>
  );
};
