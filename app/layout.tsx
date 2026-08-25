import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
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
                duration: 5000,
                style: {
                  maxWidth: '90vw',
                  width: 'auto',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: '1.5',
                  fontSize: '14px',
                  padding: '12px 14px',
                },
                className: 'sm:max-w-md !whitespace-normal !break-words !text-sm !leading-6',
              }}
            />
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
