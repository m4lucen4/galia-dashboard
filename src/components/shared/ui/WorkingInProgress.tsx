import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface WorkingInProgressProps {
  customMessages?: string[];
  messageInterval?: number;
}

export const WorkingInProgress: FC<WorkingInProgressProps> = ({
  customMessages,
  messageInterval = 5000,
}) => {
  const { t } = useTranslation();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const messages = customMessages || [t("shared.workingMessage")];

  useEffect(() => {
    // Only cycle through messages if there are multiple
    if (messages.length <= 1) return;

    const messageTimer = setInterval(() => {
      setCurrentMessageIndex((prev) =>
        prev < messages.length - 1 ? prev + 1 : 0,
      );
    }, messageInterval);

    return () => clearInterval(messageTimer);
  }, [messages.length, messageInterval]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen dark:bg-gray-900 p-4">
      <div className="text-center space-y-6">
        {/* Animated spinner */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
        </div>

        {/* Message */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            {t("shared.working")}
          </h3>
          <p className="text-blue-600 dark:text-blue-400 font-medium text-md min-h-6">
            {messages[currentMessageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};
