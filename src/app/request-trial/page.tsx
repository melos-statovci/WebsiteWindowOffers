import type { Metadata } from "next";
import { TemporaryRequestPage } from "@/components/public/temporary-request-page";
import { temporaryCtaPages } from "@/lib/public-marketing";

export const metadata: Metadata = {
  title: "Request Free Trial | Kornizo",
  description:
    "Kornizo Standard trial requests are opening soon. The page is intentionally non-persisting until the public application flow is built.",
  robots: { index: false, follow: true },
};

export default function RequestTrialPage() {
  return <TemporaryRequestPage {...temporaryCtaPages.trial} />;
}
