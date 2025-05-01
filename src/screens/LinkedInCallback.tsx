import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch } from "../redux/hooks";
import { processLinkedInCallback } from "../redux/actions/SocialNetworksActions";
import { LinkedInIcon } from "../components/icons";

export const LinkedInCallback = () => {
  const [status, setStatus] = useState("Processing LinkedIn authorization...");
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

        if (!code || !state) {
          setStatus("Missing required parameters");
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        const result = await dispatch(
          processLinkedInCallback({ code, state })
        ).unwrap();

        if (result) {
          setStatus("LinkedIn successfully connected!");
          setTimeout(() => navigate("/settings"), 1500);
        }
      } catch (error: unknown) {
        setStatus(
          `Failed to connect LinkedIn: ${
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
        <LinkedInIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-4">LinkedIn Authorization</h2>
        <p className="mb-4">{status}</p>
        <div className="animate-pulse flex justify-center">
          <div className="h-2 w-24 bg-blue-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};
