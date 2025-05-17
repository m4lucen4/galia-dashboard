import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface WorkingInProgressProps {
  duration?: number; // duración en ms
  fullScreen?: boolean;
  customMessages?: string[];
}

export const WorkingInProgress: FC<WorkingInProgressProps> = ({
  duration = 10000,
  fullScreen = true,
  customMessages,
}) => {
  const { t } = useTranslation();
  const defaultMessages = [
    "Iniciando proceso...",
    "Generando estructura...",
    "Aplicando cambios...",
    "Validando resultados...",
    "¡Casi listo!",
  ];

  const messages = customMessages || defaultMessages;
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = Math.floor(duration / messages.length);
    const progressStep = 100 / (duration / 50);

    const messageTimer = setInterval(() => {
      setCurrentMessageIndex((prev) =>
        prev < messages.length - 1 ? prev + 1 : prev
      );
    }, messageInterval);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const newValue = prev + progressStep;
        return newValue > 100 ? 100 : newValue;
      });
    }, 50);

    return () => {
      clearInterval(messageTimer);
      clearInterval(progressTimer);
    };
  }, [duration, messages.length]);

  const containerClasses = fullScreen
    ? "fixed inset-0 bg-white/90 dark:bg-gray-900/90 flex flex-col items-center justify-center z-50"
    : "w-full h-full flex flex-col items-center justify-center";

  return (
    <div className={containerClasses}>
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <div className="mt-8 text-center">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          {t("shared.working")}
        </h3>
        <p className="text-blue-600 dark:text-blue-400 font-medium text-md min-h-[1.5rem]">
          {messages[currentMessageIndex]}
        </p>
      </div>

      <div className="w-64 mt-6 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
        {Math.round(progress)}%
      </div>
    </div>
  );
};
