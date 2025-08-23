import "./globals.css";
import React from "react";

export const metadata = {
  title: "Architectural Photo Regenerator",
  description: "Upload an architectural rendering and regenerate it as a photoreal image with improved lighting and materials."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
