import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch } from "../../../redux/hooks";
import { processInstagramCallback } from "../../../redux/actions/SocialNetworksActions";
import { InstagramIcon } from "../../../components/icons";

export const InstagramCallback = () => {
  const [status, setStatus] = useState("Processing Instagram authorization...");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get("code");
        const state = queryParams.get("state");
        const error = queryParams.get("error");
        const errorDescription = queryParams.get("error_description");

        if (error) {
          setStatus(`Authorization failed: ${errorDescription || error}`);
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        const savedState = sessionStorage.getItem("instagram_auth_state");
        console.log(
          "Debug: state from URL:",
          state,
          "savedState from sessionStorage:",
          savedState
        );
        if (state !== savedState) {
          console.log("error1 State mismatch detected");
          setStatus("State mismatch. Possible CSRF attack.");
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }
        sessionStorage.removeItem("instagram_auth_state");

        if (!code || !state) {
          console.log("error2 Missing required parameters");
          setStatus("Missing required parameters");
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        const result = await dispatch(
          processInstagramCallback({ code, state })
        ).unwrap();

        console.log("Debug: processInstagramCallback result:", result);

        if (result) {
          setStatus("Instagram successfully connected!");
          setTimeout(() => navigate("/settings"), 1500);
        }
      } catch (error: unknown) {
        console.log("error3 error catched");
        console.error("Instagram callback processing error:", error);
        setStatus(
          `Failed to connect Instagram: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setTimeout(() => navigate("/settings"), 3000);
      }
    };

    processAuth();
  }, [dispatch, location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <InstagramIcon className="w-16 h-16 text-pink-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-4">Instagram Authorization</h2>
        <p className="mb-4">{status}</p>
        <div className="animate-pulse flex justify-center">
          <div className="h-2 w-24 bg-pink-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};
