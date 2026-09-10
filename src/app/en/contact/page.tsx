import type { Metadata } from "next";
import { ContactPage } from "@/components/public/contact-page";

export const metadata: Metadata = {
  title: "Contact us | Kornizo",
  description: "Questions about Kornizo? Contact us and we will get back to you.",
  alternates: { languages: { sq: "/contact", en: "/en/contact" } },
  // Indexable: a real contact page, unlike the pre-review legal drafts.
  robots: { index: true, follow: true },
};

export default function Page() {
  return <ContactPage locale="en" />;
}
