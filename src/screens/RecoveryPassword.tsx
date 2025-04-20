import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../helpers/supabase";
import { Card } from "../components/shared/ui/Card";
import { InputField } from "../components/shared/ui/InputField";
import { Button } from "../components/shared/ui/Button";
import { Alert } from "../components/shared/ui/Alert";
import { useDispatch } from "react-redux";
import { logout } from "../redux/actions/AuthActions";
import { AppDispatch } from "../redux/store";

export const RecoveryPasswordScreen = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [errorRecovery, setErrorRecovery] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters long",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Passwords do not match",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorRecovery({
          type: "error",
          text: error.message || "Error updating password",
        });
      } else {
        setErrorRecovery({
          type: "success",
          text: "Password updated successfully",
        });

        await dispatch(logout()).unwrap();
      }
    } catch (error) {
      setErrorRecovery({
        type: "error",
        text: error as string,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAlertAccept = () => {
    setErrorRecovery(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card title="Reset Password" subtitle="Enter your new password">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <InputField
              label="New Password"
              id="password"
              onChange={handlePasswordChange}
              required
              type="password"
              value={password}
              disabled={loading}
              error={message?.text}
            />
            <InputField
              label="Confirm Password"
              id="confirmPassword"
              onChange={handleConfirmPasswordChange}
              required
              type="password"
              value={confirmPassword}
              disabled={loading}
              error={message?.text}
            />
            <div className="flex justify-center">
              <Button
                title="Reset Password"
                disabled={loading}
                type="submit"
                fullWidth
              />
            </div>
          </form>
        </Card>
        {errorRecovery && (
          <Alert
            title={
              errorRecovery.type === "error"
                ? "Error when updating password, contact with support"
                : "Password updated successfully"
            }
            description={errorRecovery.text}
            onAccept={handleAlertAccept}
          />
        )}
      </div>
    </div>
  );
};
