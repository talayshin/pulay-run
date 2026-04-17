import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PulayRun",
  description: "AI-powered personalized running coach",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#D97756",
    colorBackground: "#FFFFFF",
    colorText: "#2D2A26",
    colorTextSecondary: "#8C8680",
    colorInputBackground: "#FAF7F2",
    colorInputText: "#2D2A26",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    card: {
      boxShadow: "0 2px 8px rgba(45, 42, 38, 0.08)",
      border: "1px solid #E8E2DA",
    },
    formButtonPrimary: {
      backgroundColor: "#D97756",
      "&:hover": { backgroundColor: "#C4613F" },
    },
    footerActionLink: {
      color: "#D97756",
      "&:hover": { color: "#C4613F" },
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ClerkProvider appearance={clerkAppearance}>
          <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
            <span className="text-lg font-semibold">PulayRun</span>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton>
                  <button className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="text-sm font-medium bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-colors">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
