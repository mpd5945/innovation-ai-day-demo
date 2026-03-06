import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "National Grid Operations Center",
  description:
    "Power Grid Control Center — a reactive chaos engineering demo where LitmusChaos experiments cause real-time visual degradation of grid sector services.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
