import type { Metadata } from "next";
import { TemporaryRequestPage } from "@/components/public/temporary-request-page";
import { temporaryCtaPages } from "@/lib/public-marketing";

export const metadata: Metadata = {
  title: "Request Demo | Kornizo",
  description:
    "Kornizo demo requests are opening soon. The page is intentionally non-persisting until the public demo flow is built.",
  robots: { index: false, follow: true },
};

export default function RequestDemoPage() {
  return <TemporaryRequestPage {...temporaryCtaPages.demo} />;
}
