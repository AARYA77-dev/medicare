import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import toast, { Toaster } from "react-hot-toast";
import AuthProvider from "@/components/AuthProvider";
import StoreProvider from "@/components/StoreProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Medicare",
  description: "for manage medicines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          <AuthProvider>
            {children}
            <Toaster
              toastOptions={{
                duration: 8000,
              }}
            >
              {(t) => (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: t.type === "error" ? "#ff4b4b" : t.type === "success" ? "#22c55e" : "#363636",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    fontSize: "14px",
                    maxWidth: "350px",
                    opacity: t.visible ? 1 : 0,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {typeof t.message === "function" ? t.message(t) : t.message}
                  </span>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "16px",
                      lineHeight: 1,
                      padding: "0 2px",
                      opacity: 0.8,
                    }}
                    aria-label="Close notification"
                  >
                    ×
                  </button>
                </div>
              )}
            </Toaster>
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
