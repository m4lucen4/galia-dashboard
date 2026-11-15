import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { isStrongPassword } from "@/helpers/passwordPolicy";

interface UsePasswordValidationProps {
  isEditMode: boolean;
}

export const usePasswordValidation = ({
  isEditMode,
}: UsePasswordValidationProps) => {
  const { t } = useTranslation();
  const [passwordError, setPasswordError] = useState("");

  const validatePassword = useCallback(
    (password: string): boolean => {
      setPasswordError("");

      // Check for empty password during creation
      if (!isEditMode && (!password || password.trim() === "")) {
        setPasswordError(
          t("users.validation.passwordRequired", "Password is required"),
        );
        return false;
      }

      if (isEditMode && (!password || password.trim() === "")) {
        return true;
      }
      if (!isStrongPassword(password)) {
        setPasswordError(t("users.validation.passwordWeak"));
        return false;
      }

      return true;
    },
    [isEditMode, t],
  );

  return {
    passwordError,
    validatePassword,
    setPasswordError,
  };
};
