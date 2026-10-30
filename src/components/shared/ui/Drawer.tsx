import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface CardProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  closeOnOutsideClick?: boolean;
  variant?: "default" | "dashboard";
  size?: "default" | "wide";
  closeLabel?: string;
}

export const Drawer: React.FC<CardProps> = ({
  title,
  children,
  isOpen,
  onClose,
  closeOnOutsideClick = true,
  variant = "default",
  size = "default",
  closeLabel = "Close panel",
}) => {
  const dashboard = variant === "dashboard";
  const handleClose = () => {
    if (closeOnOutsideClick) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className={dashboard ? "relative z-50 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]" : "relative z-10"}>
      <DialogBackdrop
        transition
        className={dashboard ? "fixed inset-0 bg-[#010000]/40 transition-opacity duration-300 ease-in-out data-closed:opacity-0 motion-reduce:transition-none" : "fixed inset-0 bg-gray-500/90 transition-opacity duration-500 ease-in-out data-closed:opacity-0"}
      />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className={dashboard ? "pointer-events-none fixed inset-y-0 right-0 flex max-w-full sm:pl-10" : "pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10"}>
            <DialogPanel
              transition
              className={dashboard ? "pointer-events-auto relative h-full min-h-0 w-screen max-w-full overflow-hidden transform transition duration-300 ease-in-out data-closed:translate-x-full motion-reduce:transition-none sm:w-[min(48rem,calc(100vw-2rem))]" + (size === "wide" ? " lg:w-[min(96rem,calc(100vw-2.5rem))]" : "") : "pointer-events-auto relative w-full transform transition duration-500 ease-in-out data-closed:translate-x-full sm:w-[50vw] sm:duration-700"}
            >
              <TransitionChild>
                <div className={dashboard ? "absolute top-5 right-5 z-10 duration-300 data-closed:opacity-0 motion-reduce:transition-none" : "absolute top-0 left-0 -ml-8 flex pt-4 pr-2 duration-500 ease-in-out data-closed:opacity-0 sm:-ml-10 sm:pr-4"}>
                  <button
                    type="button"
                    onClick={onClose}
                    className={dashboard ? "relative flex size-11 items-center justify-center rounded-full border border-[#010000]/30 text-[#010000] hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-[#010000] focus-visible:outline-offset-2" : "relative rounded-md text-white focus:ring-2 focus:ring-white focus:outline-hidden"}
                  >
                    <span className="absolute -inset-2.5" />
                    <span className="sr-only">{closeLabel}</span>
                    <XMarkIcon aria-hidden="true" className="size-6" />
                  </button>
                </div>
              </TransitionChild>
              <div className={dashboard ? "flex h-full min-h-0 flex-col overflow-hidden border-l border-[#010000]/20 bg-[#d8e4d6] shadow-xl" : "flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl"}>
                <div className={dashboard ? "shrink-0 px-5 py-8 pr-20 sm:px-8 sm:pr-20" : "px-4 sm:px-6"}>
                  <DialogTitle className={dashboard ? "text-3xl font-medium tracking-[-0.04em]" : "text-base font-semibold text-gray-900"}>
                    {title}
                  </DialogTitle>
                </div>
                <div className={dashboard ? "relative min-h-0 min-w-0 flex-1 overflow-y-auto px-5 pb-8 sm:px-8" : "relative mt-6 flex-1 px-4 sm:px-6"}>
                  {children}
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
