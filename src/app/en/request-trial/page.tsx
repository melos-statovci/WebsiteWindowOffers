import { TemporaryRequestPage } from "@/components/public/temporary-request-page";
import { temporaryPageMetadata } from "@/components/public/metadata";
import { publicMarketing } from "@/lib/public-marketing";

export const metadata = temporaryPageMetadata("en", "trial");

export default function EnglishRequestTrialPage() {
  return <TemporaryRequestPage {...publicMarketing.en.temporaryCtaPages.trial} />;
}
