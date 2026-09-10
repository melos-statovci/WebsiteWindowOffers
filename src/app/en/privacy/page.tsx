import { LegalPage } from "@/components/public/legal-page";
import { legalPageMetadata } from "@/components/public/metadata";

export const metadata = legalPageMetadata("en", "privacy");

export default function Page() {
  return <LegalPage locale="en" doc="privacy" />;
}
