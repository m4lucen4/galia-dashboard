import { useState } from "react";
import { useAppDispatch } from "../../redux/hooks";
import {
  updateUser,
  UpdateUserProps,
  fetchUserByUid,
  updateProfile,
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return;
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormData({ ...formData, avatarFile: file });
      const url = URL.createObjectURL(file);
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } else {
      setFormData({ ...formData, avatarFile: undefined });
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
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

    const thunk = dataToSubmit.avatarFile ? updateProfile : updateUser;
    dispatch(thunk(dataToSubmit as UpdateUserProps))
      .unwrap()
      .then(() => {
        if (user?.uid) {
          dispatch(fetchUserByUid(user.uid));
        }
        setIsEditing(false);
        setAvatarPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
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
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

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
    avatarPreview,

    // Handlers
    handleChange,
    handleAvatarChange,
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
