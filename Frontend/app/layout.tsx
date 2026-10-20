import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/auth-provider";

export const metadata: Metadata = {
  title: "WorkTrack — Central Saga Mandala",
  description: "Sistem Monitoring Aktivitas Karyawan PT Central Saga Mandala",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
