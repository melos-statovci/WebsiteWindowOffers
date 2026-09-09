import { TemporaryRequestPage } from "@/components/public/temporary-request-page";
import { temporaryPageMetadata } from "@/components/public/metadata";
import { publicMarketing } from "@/lib/public-marketing";

export const metadata = temporaryPageMetadata("sq", "demo");

export default function RequestDemoPage() {
  return <TemporaryRequestPage {...publicMarketing.sq.temporaryCtaPages.demo} />;
}
