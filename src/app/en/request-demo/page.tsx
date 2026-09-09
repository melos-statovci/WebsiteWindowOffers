import { TemporaryRequestPage } from "@/components/public/temporary-request-page";
import { temporaryPageMetadata } from "@/components/public/metadata";
import { publicMarketing } from "@/lib/public-marketing";

export const metadata = temporaryPageMetadata("en", "demo");

export default function EnglishRequestDemoPage() {
  return <TemporaryRequestPage {...publicMarketing.en.temporaryCtaPages.demo} />;
}
