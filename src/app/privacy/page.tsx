import { LegalPage } from "@/components/public/legal-page";
import { legalPageMetadata } from "@/components/public/metadata";

export const metadata = legalPageMetadata("sq", "privacy");

export default function Page() {
  return <LegalPage locale="sq" doc="privacy" />;
}
