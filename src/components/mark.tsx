import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M8 11.5c0-1.4 1.1-2.5 2.5-2.5h8c1.4 0 2.5 1.1 2.5 2.5v6.2c0 1.4-1.1 2.5-2.5 2.5h-3.1L11 23.2v-3h-.5C9.1 20.2 8 19.1 8 17.7z"
        fill="var(--color-bg)"
      />
      <circle cx="23.2" cy="22.6" r="4.2" fill="var(--color-bg)" />
      <path
        d="M23.2 20.4v4.4M21.4 22.2h3.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
