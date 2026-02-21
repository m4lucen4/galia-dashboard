import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface UsePasswordValidationProps {
  isEditMode: boolean;
  minLength?: number;
}

export const usePasswordValidation = ({
  isEditMode,
  minLength = 6,
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
      if (password.length < minLength) {
        setPasswordError(
          t("users.validation.passwordMinLength", {
            defaultValue: `Password must be at least ${minLength} characters`,
            count: minLength,
          }),
        );
        return false;
      }

      return true;
    },
    [isEditMode, minLength, t],
  );

  return {
    passwordError,
    validatePassword,
    setPasswordError,
  };
};
