import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conflux — Event Traffic Command Center",
  description:
    "Predictive event-traffic forecasting and deployment planning for Bengaluru Traffic Police. Forecast congestion, optimize manpower, plan barricades and diversions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
