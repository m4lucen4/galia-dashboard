import React from "react";
import { Card } from "../shared/ui/Card";
import { Switch } from "../shared/ui/Switch";

export const CardPreferences: React.FC = () => {
  return (
    <Card title="User Settings" subtitle="Manage your account preferences">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Email notifications
            </h4>
            <p className="text-xs text-gray-500">
              Receive emails about your account activity
            </p>
          </div>
          <Switch checked={true} onChange={() => {}} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Project updates
            </h4>
            <p className="text-xs text-gray-500">
              Get notified when your projects are published
            </p>
          </div>
          <Switch checked={true} onChange={() => {}} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Marketing emails
            </h4>
            <p className="text-xs text-gray-500">
              Receive tips and product updates
            </p>
          </div>
          <Switch checked={false} onChange={() => {}} />
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          type="button"
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          Save preferences
        </button>
      </div>
    </Card>
  );
};
