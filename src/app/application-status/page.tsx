import type { Metadata } from "next";
import { ApplicationStatusPage } from "@/components/public/application-status-page";

export const metadata: Metadata = {
  title: "Statusi i aplikimit | Kornizo",
  description: "Shihni statusin e kërkesës suaj për Kornizo Standard.",
  alternates: { languages: { sq: "/application-status", en: "/en/application-status" } },
};

export const dynamic = "force-dynamic";

export default function AlbanianApplicationStatusRoute() {
  return <ApplicationStatusPage locale="sq" />;
}
