import { MarketingPage } from "@/components/public/marketing-page";
import { publicPageMetadata } from "@/components/public/metadata";
import { publicMarketing } from "@/lib/public-marketing";

export const metadata = publicPageMetadata("en");

export default function EnglishHome() {
  return <MarketingPage content={publicMarketing.en} />;
}
