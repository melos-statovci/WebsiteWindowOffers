import { LegalPage } from "@/components/public/legal-page";
import { legalPageMetadata } from "@/components/public/metadata";

export const metadata = legalPageMetadata("en", "terms");

export default function Page() {
  return <LegalPage locale="en" doc="terms" />;
}
