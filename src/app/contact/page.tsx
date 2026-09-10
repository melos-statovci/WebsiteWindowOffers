import type { Metadata } from "next";
import { ContactPage } from "@/components/public/contact-page";

export const metadata: Metadata = {
  title: "Na kontaktoni | Kornizo",
  description: "Keni pyetje për Kornizo? Na kontaktoni dhe do t'ju kthejmë përgjigje.",
  alternates: { languages: { sq: "/contact", en: "/en/contact" } },
  // Indexable: a real contact page, unlike the pre-review legal drafts.
  robots: { index: true, follow: true },
};

export default function Page() {
  return <ContactPage locale="sq" />;
}
