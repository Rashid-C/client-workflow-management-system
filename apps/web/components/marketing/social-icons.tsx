import type { ReactNode } from "react";

export type SocialNetwork = "facebook" | "instagram" | "x" | "linkedin";

// Outline marks in the same 24px, 1.8 stroke style as the lucide icons used
// elsewhere on the page (lucide no longer ships brand icons).
const ICONS: Record<SocialNetwork, { label: string; paths: ReactNode }> = {
  facebook: {
    label: "Facebook",
    paths: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  },
  instagram: {
    label: "Instagram",
    paths: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
  },
  x: {
    label: "X",
    paths: <path d="M4 4l11.733 16H20L8.267 4zM4 20l6.768-6.768m2.46-2.46L20 4" />,
  },
  linkedin: {
    label: "LinkedIn",
    paths: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
  },
};

/** Links to the firm's social profiles; renders nothing for an empty list. */
export default function SocialLinks({
  links,
  className = "",
}: {
  links: readonly { network: SocialNetwork; url: string }[];
  className?: string;
}) {
  if (!links.length) return null;
  return (
    <ul className={`flex gap-2 ${className}`}>
      {links.map(({ network, url }) => (
        <li key={network}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ICONS[network].label}
            className="flex size-9 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition hover:border-brand-400 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {ICONS[network].paths}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
