import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Novel · Anaesthetic Charts",
  description: "Anaesthetic & surgical charting for veterinary clinics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
