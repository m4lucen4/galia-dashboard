import React, { useMemo, useEffect, ChangeEvent } from "react";
import { InputField } from "../shared/ui/InputField";
import { LinkedInPageInfo, SocialNetworksCheck } from "../../types";
import { InstagramIcon, LinkedInIcon } from "../icons";
import { useLinkedInPages } from "../../hooks/useLinkedInPages";

interface ConfigPublishProps {
  publishDate: string;
  socialNetworks: SocialNetworksCheck;
  onDateChange: (newDate: string) => void;
  onSocialNetworkChange: (
    network: "instagram" | "linkedln",
    pageInfo?: LinkedInPageInfo
  ) => void;
}

export const ConfigPublish: React.FC<ConfigPublishProps> = ({
  publishDate,
  socialNetworks,
  onDateChange,
  onSocialNetworkChange,
}) => {
  const { linkedin } = useLinkedInPages();

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

  const handleLinkedInChange = (checked: boolean) => {
    if (checked) {
      if (linkedin.adminPages && linkedin.adminPages.length > 0) {
        const defaultPage = linkedin.adminPages[0];
        onSocialNetworkChange("linkedln", {
          id: defaultPage.id,
          name: defaultPage.name,
          type: defaultPage.type,
        });
      } else {
        onSocialNetworkChange("linkedln");
      }
    } else {
      onSocialNetworkChange("linkedln");
    }
  };

  const handleLinkedInPageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedPage = linkedin.adminPages?.find(
      (page) => page.id === selectedId
    );

    if (selectedPage) {
      onSocialNetworkChange("linkedln", {
        id: selectedPage.id,
        name: selectedPage.name,
        type: selectedPage.type,
      });
    }
  };

  const isLinkedInChecked = !!socialNetworks.linkedln;

  const selectedLinkedInId =
    typeof socialNetworks.linkedln === "object"
      ? socialNetworks.linkedln.id
      : "";

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
          {/* Instagram checkbox */}
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

          {/* LinkedIn checkbox */}
          <div className="flex items-center">
            <input
              id="linkedln"
              type="checkbox"
              className={`h-4 w-4 focus:ring-indigo-500 border-gray-300 rounded ${
                isDateValid && linkedin.isConnected
                  ? "text-indigo-600"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              checked={isLinkedInChecked}
              onChange={(e) => handleLinkedInChange(e.target.checked)}
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

          {/* LinkedIn page selector */}
          {isLinkedInChecked && linkedin.isConnected && (
            <div className="ml-6 mt-2">
              <label
                htmlFor="linkedin-page"
                className="block text-xs text-gray-600 mb-1"
              >
                Select where to publish
              </label>

              {linkedin.adminPages && linkedin.adminPages.length > 0 ? (
                <select
                  id="linkedin-page"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  value={selectedLinkedInId}
                  onChange={handleLinkedInPageChange}
                >
                  {linkedin.adminPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name} (
                      {page.type === "PERSON"
                        ? "Personal Profile"
                        : "Company Page"}
                      )
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-gray-500">
                  No LinkedIn pages found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
