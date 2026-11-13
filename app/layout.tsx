import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@t007/input/style.css";
import "@t007/dialog/style.css";
import "@t007/toast/style.css";
import "@t007/utils/styles/ripple.css";
import "@t007/utils/styles/scroll-assist.css";
import "./globals.css";
import "./overrides.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/context/auth-context";
import { ConvexClientProvider } from "@/context/convex-client-provider";
import { ThemeInitializer } from "@/components/common/ThemeInitializer";
import KeyHandler from "@/components/common/KeyHandler";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Babcock Votes",
  description: "The official voting platform for Babcock University",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en" suppressHydrationWarning className={geistSans.variable}>
      <head>
        <ThemeInitializer />
      </head>
      <body className={cn(geistSans.variable, "antialiased t007-input-bleeding-edge")}>
        <NextTopLoader showSpinner={false} color="var(--gold)" zIndex={2147483647} shadow={false} height={2.6} />
        <ConvexClientProvider>
          <AuthProvider>
            <KeyHandler />
            {children}
          </AuthProvider>
        </ConvexClientProvider>
        <div id="root-portal" />
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
