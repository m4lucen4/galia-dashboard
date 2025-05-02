import React, { useMemo, useEffect, ChangeEvent } from "react";
import { InputField } from "../shared/ui/InputField";
import { SocialNetworksCheck } from "../../types";
import { InstagramIcon, LinkedInIcon } from "../icons";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { checkLinkedInConnection } from "../../redux/actions/SocialNetworksActions";

interface ConfigPublishProps {
  publishDate: string;
  socialNetworks: SocialNetworksCheck;
  onDateChange: (newDate: string) => void;
  onSocialNetworkChange: (network: "instagram" | "linkedln") => void;
}

export const ConfigPublish: React.FC<ConfigPublishProps> = ({
  publishDate,
  socialNetworks,
  onDateChange,
  onSocialNetworkChange,
}) => {
  const dispatch = useAppDispatch();
  const { linkedin } = useAppSelector((state) => state.socialNetworks);
  const currentDate = useMemo(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }, []);

  const isDateValid = !!publishDate && publishDate >= currentDate;
  const isCurrentDate = publishDate === currentDate;

  const dateError =
    publishDate && publishDate < currentDate
      ? "Publish date must be in the future"
      : "";

  const getHelperText = () => {
    if (!publishDate) {
      return "Select a date to publish the project";
    }
    if (isCurrentDate) {
      return "By selecting the current date, your project will be published immediately";
    }
    return "";
  };

  useEffect(() => {
    dispatch(checkLinkedInConnection());
  }, [dispatch]);

  useEffect(() => {
    if (!publishDate) {
      if (socialNetworks.instagram) {
        onSocialNetworkChange("instagram");
      }
      if (socialNetworks.linkedln) {
        onSocialNetworkChange("linkedln");
      }
    }
  }, [
    publishDate,
    socialNetworks.instagram,
    socialNetworks.linkedln,
    onSocialNetworkChange,
  ]);

  const handleDateChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newDate = e.target.value;
    onDateChange(newDate);
  };

  return (
    <div className="space-y-4 mt-4">
      <InputField
        id="publishDate"
        label="Publication date"
        type="date"
        value={publishDate}
        onChange={handleDateChange}
        min={currentDate}
        error={dateError}
        helperText={getHelperText()}
      />
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">
          Select social networks
        </p>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              id="instagram"
              type="checkbox"
              className={`h-4 w-4 focus:ring-indigo-500 border-gray-300 rounded ${
                isDateValid
                  ? "text-indigo-600"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              checked={socialNetworks.instagram}
              onChange={() => onSocialNetworkChange("instagram")}
              disabled={!isDateValid}
            />
            <label
              htmlFor="instagram"
              className={`ml-2 flex items-center text-sm ${
                isDateValid ? "text-gray-700" : "text-gray-400"
              }`}
            >
              <InstagramIcon
                className={`w-5 h-5 mr-1 ${!isDateValid ? "opacity-50" : ""}`}
              />
              Instagram
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="linkedln"
              type="checkbox"
              className={`h-4 w-4 focus:ring-indigo-500 border-gray-300 rounded ${
                isDateValid && linkedin.isConnected
                  ? "text-indigo-600"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              checked={socialNetworks.linkedln}
              onChange={() => onSocialNetworkChange("linkedln")}
              disabled={!isDateValid || !linkedin.isConnected}
            />
            <label
              htmlFor="linkedln"
              className={`ml-2 flex items-center text-sm ${
                isDateValid && linkedin.isConnected
                  ? "text-gray-700"
                  : "text-gray-400"
              }`}
            >
              <LinkedInIcon
                className={`w-5 h-5 mr-1 ${
                  !isDateValid || !linkedin.isConnected ? "opacity-50" : ""
                }`}
              />
              LinkedIn
            </label>
            {!linkedin.isConnected && !!publishDate && (
              <span className="ml-2 text-xs text-red-500">
                No LinkedIn connection.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
