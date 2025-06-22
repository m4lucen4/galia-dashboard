import { useState } from "react";
import { useAppDispatch } from "../../redux/hooks";
import {
  updateUser,
  UpdateUserProps,
  fetchUserByUid,
} from "../../redux/actions/UserActions";
import { changePassword } from "../../redux/actions/AuthActions";
import { useTranslation } from "react-i18next";
import { UserDataProps } from "../../types/index";

interface UseProfileHandlersProps {
  formData: UpdateUserProps | null;
  setFormData: (data: UpdateUserProps | null) => void;
  userData: UserDataProps | null;
  setIsEditing: (editing: boolean) => void;
  user: UpdateUserProps | null;
}

export const useProfileHandlers = ({
  formData,
  setFormData,
  userData,
  setIsEditing,
  user,
}: UseProfileHandlersProps) => {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();

  const [passwordError, setPasswordError] = useState("");
  const [showPasswordAlert, setShowPasswordAlert] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

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

  return {
    // States
    passwordError,
    showPasswordAlert,
    newPassword,
    repeatPassword,

    // Handlers
    handleChange,
    handlePasswordChange,
    handlePasswordAlertAccept,
    handleSubmit,
    handleLanguageChange,
    handleEdit,
    handleCancel,
    handleChangePassword,
    handlePasswordAlertCancel,
  };
};
