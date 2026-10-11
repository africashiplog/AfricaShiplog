import type { Metadata, Viewport } from "next";
import { Amiri, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";

const display = Amiri({ subsets: ["arabic", "latin"], weight: ["400", "700"], variable: "--font-display" });
const body = Noto_Naskh_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

// Every page reads live data from the database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "الخريطة التاريخية لمدافن الشمشوية في إيگيدي وضواحيها", template: "%s | مدافن الشمشوية" },
  description:
    "منصة بحثية توثيقية للمدافن الشمشوية والأعلام المدفونين فيها في إيگيدي وضواحيها: خريطة تفاعلية، تراجم، أنساب، ومصادر موثقة.",
};

export const viewport: Viewport = { themeColor: "#15120f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">{children}</body>
    </html>
  );
}
