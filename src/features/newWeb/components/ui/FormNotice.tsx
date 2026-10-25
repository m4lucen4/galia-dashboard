import type { IRequest } from "@/types";

export function FormNotice({ inProgress, messages, ok }: IRequest) {
  return (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={messages ? "rounded-[20px] border-[1.5px] border-[#010000] p-4 text-sm text-[#010000]" : "sr-only"}
      data-state={inProgress ? "pending" : ok ? "success" : messages ? "error" : "idle"}
    >
      {messages}
    </p>
  );
}
