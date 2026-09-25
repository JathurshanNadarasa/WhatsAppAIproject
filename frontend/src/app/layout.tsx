import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import "./globals.css";

const plex = IBM_Plex_Sans({
    variable: "--font-plex",
    subsets: ["latin"],
    weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
    title: "Nexora console",
    description: "WhatsApp leads, conversations and handovers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${plex.variable} h-full antialiased`}>
            <body className="min-h-full">{children}</body>
        </html>
    );
}
