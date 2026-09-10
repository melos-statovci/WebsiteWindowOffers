import { MarketingPage } from "@/components/public/marketing-page";
import { publicPageMetadata } from "@/components/public/metadata";
import { publicMarketing } from "@/lib/public-marketing";
import { configuredSupportEmail } from "@/lib/support-contact";

export const metadata = publicPageMetadata("sq");

export default function Home() {
  return <MarketingPage content={publicMarketing.sq} supportEmail={configuredSupportEmail()} />;
}
