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
import { PillButton } from "@/components/shared/ui/PillButton";
import { LockClosedIcon } from "@heroicons/react/24/outline";

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
    handleProvinceIdChange,
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
        province_id: userData.province_id ?? null,
        country: userData.country ?? null,
        job_position: userData.job_position || "",
        web: userData.web || "",
        tags: userData.tags || "",
      });
    }
  }, [userData]);

  if (userFetchByUidRequest?.inProgress) {
    return (
      <div className="w-full min-w-0 py-4">
        <LoadingSpinner fullPage />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#010000]/15 pb-8">
        <div className="min-w-0 space-y-3">
          <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
            {t("profile.title")}
          </h1>
          <p className="text-base leading-relaxed text-[#010000]/65">
            {t("profile.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PillButton variant="outline" onClick={handleChangePassword}>
            <LockClosedIcon className="size-4 shrink-0" aria-hidden="true" />
            {t("profile.changePassword")}
          </PillButton>
          {formData && userData && (
            <FormButtons
              formId="profile-form"
              isEditing={isEditing}
              isLoading={userUpdateRequest?.inProgress || false}
              onEdit={handleEdit}
              onCancel={handleCancel}
            />
          )}
        </div>
      </header>
      {formData && userData && (
        <div>
          <form id="profile-form" onSubmit={handleSubmit}>
            <ProfileForm
              formData={formData}
              userData={userData}
              isEditing={isEditing}
              onChange={handleChange}
              onCountryChange={handleCountryChange}
              onProvinceIdChange={handleProvinceIdChange}
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
