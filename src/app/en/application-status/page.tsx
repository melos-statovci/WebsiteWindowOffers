import type { Metadata } from "next";
import { ApplicationStatusPage } from "@/components/public/application-status-page";

export const metadata: Metadata = {
  title: "Application status | Kornizo",
  description: "View the status of your Kornizo Standard request.",
  alternates: { languages: { sq: "/application-status", en: "/en/application-status" } },
};

export const dynamic = "force-dynamic";

export default function EnglishApplicationStatusRoute() {
  return <ApplicationStatusPage locale="en" />;
}
