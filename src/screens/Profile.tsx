import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";
import {
  fetchUserByUid,
  updateUser,
  UpdateUserProps,
} from "../redux/actions/UserActions";
import { changePassword } from "../redux/actions/AuthActions";
import { Button } from "../components/shared/ui/Button";
import { Alert } from "../components/shared/ui/Alert";
import { clearErrors } from "../redux/slices/UserSlice";
import { InputField } from "../components/shared/ui/InputField";
import { LoadingSpinner } from "../components/shared/ui/LoadingSpinner";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { SelectField } from "../components/shared/ui/SelectField";

export const Profile = () => {
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { userData, userUpdateRequest, userFetchByUidRequest } = useAppSelector(
    (state: RootState) => state.user
  );
  const { changePasswordRequest } = useAppSelector(
    (state: RootState) => state.auth
  );
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const [passwordError, setPasswordError] = useState("");
  const [showPasswordAlert, setShowPasswordAlert] = useState(false);
  const [formData, setFormData] = useState<UpdateUserProps | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

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
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        phone: userData.phone || "",
        company: userData.company || "",
        vat: userData.vat || "",
        active: userData.active,
        role: userData.role,
        password: "",
        language: userData.language || "",
      });
    }
  }, [userData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    if (!formData) return;

    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handlePasswordChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { id, value } = e.target;

    if (id === "password") {
      setNewPassword(value);
    } else if (id === "repeatPassword") {
      setRepeatPassword(value);
    }

    // Limpiar error al escribir
    setPasswordError("");
  };

  const handlePasswordAlertAccept = () => {
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== repeatPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    dispatch(changePassword({ newPassword }));
    setShowPasswordAlert(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData) return;

    const dataToSubmit = { ...formData };
    if (!dataToSubmit.password || dataToSubmit.password.trim() === "") {
      delete dataToSubmit.password;
    }

    dispatch(updateUser(dataToSubmit))
      .unwrap()
      .then(() => {
        if (user?.uid) {
          dispatch(fetchUserByUid(user.uid));
        }
        setIsEditing(false);
      });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = e.target.value;
    i18n.changeLanguage(selectedLanguage);

    if (formData) {
      setFormData({ ...formData, language: selectedLanguage });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);

    if (userData) {
      setFormData({
        id: userData.id,
        uid: userData.uid,
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        phone: userData.phone || "",
        company: userData.company || "",
        vat: userData.vat || "",
        active: userData.active,
        role: userData.role,
        password: "",
        language: userData.language || "",
      });
    }
  };

  const handleChangePassword = () => {
    setNewPassword("");
    setRepeatPassword("");
    setPasswordError("");
    setShowPasswordAlert(true);
  };

  const handlePasswordAlertCancel = () => {
    setShowPasswordAlert(false);
  };

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
      <div className="flex justify-between items-center">
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
            <div className="mt-6 border-t border-gray-100">
              <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  id="first_name"
                  label={t("profile.firstName")}
                  type="text"
                  disabled={!isEditing}
                  value={formData.first_name ?? ""}
                  onChange={handleChange}
                  required
                  className={`block w-full py-1.5 text-base text-gray-900 ${
                    isEditing
                      ? "bg-transparent outline-none px-0 border-b-2 border-gray-800 focus:border-black"
                      : "bg-transparent border-none outline-none px-0 border-b border-transparent hover:border-gray-200"
                  } sm:text-sm/6`}
                />
                <InputField
                  id="last_name"
                  label={t("profile.lastName")}
                  type="text"
                  disabled={!isEditing}
                  value={formData.last_name ?? ""}
                  onChange={handleChange}
                  required
                  className={`block w-full py-1.5 text-base text-gray-900 ${
                    isEditing
                      ? "bg-transparent outline-none px-0 border-b-2 border-gray-800 focus:border-black"
                      : "bg-transparent border-none outline-none px-0 border-b border-transparent hover:border-gray-200"
                  } sm:text-sm/6`}
                />
              </div>
              <div className="py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <dt className="text-sm/6 font-medium text-gray-900">
                      Email
                    </dt>
                    <dd className="mt-1 text-sm/6 text-gray-700">
                      {userData.email}
                    </dd>
                  </div>
                  <InputField
                    id="phone"
                    label={t("profile.phone")}
                    type="text"
                    disabled={!isEditing}
                    value={formData.phone ?? ""}
                    onChange={handleChange}
                    required
                    className={`block w-full py-1.5 text-base text-gray-900 ${
                      isEditing
                        ? "bg-transparent outline-none px-0 border-b-2 border-gray-800 focus:border-black"
                        : "bg-transparent border-none outline-none px-0 border-b border-transparent hover:border-gray-200"
                    } sm:text-sm/6`}
                  />
                </div>
              </div>
              <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  id="company"
                  label={t("profile.company")}
                  type="text"
                  disabled={!isEditing}
                  value={formData.company ?? ""}
                  onChange={handleChange}
                  required
                  className={`block w-full py-1.5 text-base text-gray-900 ${
                    isEditing
                      ? "bg-transparent outline-none px-0 border-b-2 border-gray-800 focus:border-black"
                      : "bg-transparent border-none outline-none px-0 border-b border-transparent hover:border-gray-200"
                  } sm:text-sm/6`}
                />
                <InputField
                  id="vat"
                  label={t("profile.vat")}
                  type="text"
                  disabled={!isEditing}
                  value={formData.vat ?? ""}
                  onChange={handleChange}
                  required
                  className={`block w-full py-1.5 text-base text-gray-900 ${
                    isEditing
                      ? "bg-transparent outline-none px-0 border-b-2 border-gray-800 focus:border-black"
                      : "bg-transparent border-none outline-none px-0 border-b border-transparent hover:border-gray-200"
                  } sm:text-sm/6`}
                />
              </div>
              <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  id="language"
                  className={`block w-full py-1.5 text-base text-gray-900 ${
                    isEditing
                      ? "bg-transparent outline-none px-0 border-b-2 border-gray-800 focus:border-black"
                      : "bg-transparent border-none outline-none px-0 border-b border-transparent hover:border-gray-200"
                  } sm:text-sm/6`}
                  disabled={!isEditing}
                  label={t("profile.language")}
                  value={formData.language ?? ""}
                  onChange={handleLanguageChange}
                  options={[
                    { value: "es", label: "Español" },
                    { value: "en", label: "English" },
                  ]}
                />
              </div>
            </div>
            {isEditing ? (
              <div className="flex space-x-3 mt-4">
                <Button
                  title={t("profile.save")}
                  type="submit"
                  disabled={userUpdateRequest?.inProgress}
                />
                <Button
                  title={t("profile.cancel")}
                  secondary
                  onClick={handleCancel}
                  disabled={userUpdateRequest?.inProgress}
                />
              </div>
            ) : (
              <Button title={t("profile.editProfile")} onClick={handleEdit} />
            )}
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
      {showPasswordAlert && (
        <Alert
          title={t("profile.titleChangePassword")}
          description={t("profile.descriptionChangePassword")}
          icon={LockClosedIcon}
          onAccept={handlePasswordAlertAccept}
          onCancel={handlePasswordAlertCancel}
        >
          <InputField
            id="password"
            label={t("profile.newPassword")}
            type="password"
            value={newPassword}
            onChange={handlePasswordChange}
            required
            error={passwordError}
            disabled={changePasswordRequest?.inProgress}
          />
          <InputField
            id="repeatPassword"
            label={t("profile.confirmPassword")}
            type="password"
            value={repeatPassword}
            onChange={handlePasswordChange}
            required
            disabled={changePasswordRequest?.inProgress}
            error=""
          />
        </Alert>
      )}
    </div>
  );
};
