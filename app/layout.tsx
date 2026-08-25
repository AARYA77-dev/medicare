import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster, toast } from "react-hot-toast";
import { FaTimes } from "react-icons/fa";
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
                style: {
                  maxWidth: '90vw',
                  width: 'auto',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: '1.5',
                  fontSize: '14px',
                  padding: 0,
                },
                className: 'sm:max-w-md !whitespace-normal !break-words !text-sm !leading-6',
              }}
            >
              {/* {(t) => (
                <div className="relative flex max-w-[90vw] items-start gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] px-3.5 py-2.5 pr-9 text-sm leading-5 text-white shadow-lg sm:max-w-md">
                  <div className="flex-1 whitespace-normal break-words">{t.message}</div>
                  <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    className="absolute right-2 top-2 rounded-md p-1 text-gray-300 transition hover:text-white"
                    aria-label="Dismiss notification"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              )} */}

                 {(t) => (
                  <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    className="absolute right-2 top-2 rounded-md p-1 text-gray-300 transition hover:text-white"
                    aria-label="Dismiss notification"
                  >
                    <FaTimes size={12} />
                  </button>
              )}
            </Toaster>
            
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
