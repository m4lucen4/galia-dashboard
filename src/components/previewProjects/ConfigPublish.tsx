import React from "react";
import { InputField } from "../shared/ui/InputField";
import { SocialNetworksCheck } from "../../types";
import { InstagramIcon, LinkedInIcon } from "../icons";

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
  return (
    <div className="space-y-4 mt-4">
      <InputField
        id="publishDate"
        label="Publication date"
        type="date"
        value={publishDate}
        onChange={(e) => onDateChange(e.target.value)}
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
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={socialNetworks.instagram}
              onChange={() => onSocialNetworkChange("instagram")}
            />
            <label
              htmlFor="instagram"
              className="ml-2 flex items-center text-sm text-gray-700"
            >
              <InstagramIcon className="w-5 h-5 mr-1" /> Instagram
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="linkedln"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={socialNetworks.linkedln}
              onChange={() => onSocialNetworkChange("linkedln")}
            />
            <label
              htmlFor="linkedln"
              className="ml-2 flex items-center text-sm text-gray-700"
            >
              <LinkedInIcon className="w-5 h-5 mr-1" /> LinkedIn
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
