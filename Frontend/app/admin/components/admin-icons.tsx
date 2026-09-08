import type { SVGProps } from "react";

export type AdminIconName =
  | "activity"
  | "bell"
  | "building"
  | "chart"
  | "dashboard"
  | "download"
  | "edit"
  | "eye"
  | "filter"
  | "check-circle"
  | "key"
  | "log-in"
  | "log-out"
  | "logout"
  | "menu"
  | "project"
  | "print"
  | "power"
  | "plus"
  | "rotate"
  | "search"
  | "settings"
  | "shield"
  | "user"
  | "user-check"
  | "user-minus"
  | "users"
  | "x";

export function AdminIcon({
  name,
  ...props
}: { name: AdminIconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<AdminIconName, React.ReactNode> = {
    activity: <path d="M4 19V9m5 10V5m5 14v-7m5 7V3" />,
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    building: <path d="M4 21h16M6 21V4h12v17M9 8h2m2 0h2m-6 4h2m2 0h2m-6 4h2m2 0h2" />,
    chart: <path d="M4 19V9m5 10v-6m5 6V5m5 14V3" />,
    dashboard: <path d="m3 11 9-8 9 8M5 10v10h14V10m-9 10v-6h4v6" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />,
    edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />,
    eye: <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7Z" />,
    "check-circle": <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14.01l-3-3" />,
    key: <path d="M21 2 13.6 9.4M15 4l5 5M9.5 14.5a5 5 0 1 1-7.1 7.1 5 5 0 0 1 7.1-7.1ZM6 18h.01" />,
    "log-in": <path d="m15 3 4 4-4 4M19 7H8m2 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />,
    "log-out": <path d="m17 7 4 5-4 5m4-5H9m2 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />,
    logout: <path d="M10 17l5-5-5-5m5 5H3m12-9h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    project: <path d="M9 5h6m-7 3h8M7 3h10a2 2 0 0 1 2 2v16H5V5a2 2 0 0 1 2-2Zm2 10 2 2 4-4" />,
    print: <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6Z" />,
    power: <path d="M12 2v10m6.4-6.4a9 9 0 1 1-12.8 0" />,
    plus: <path d="M12 5v14M5 12h14" />,
    rotate: <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />,
    search: <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />,
    settings: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5c0-.5-.1-1-.2-1.5l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.3 2.6a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5l.3 2.6h4l.3-2.6a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5c.1-.5.2-1 .2-1.5Z" />,
    shield: <path d="M12 3 20 6v5c0 5-3.4 9-8 10-4.6-1-8-5-8-10V6l8-3Zm-3 9 2 2 4-4" />,
    user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />,
    "user-check": <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 11.5-5.3M16 19l2 2 4-5" />,
    "user-minus": <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 13.5-2.5M17 15h5" />,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9m-2-12a4 4 0 0 1 0 7.7" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
