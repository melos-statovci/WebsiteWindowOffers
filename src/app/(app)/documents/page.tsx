import { UpgradeWall } from "@/components/upgrade-wall";
import { gatedRoutes } from "@/lib/plan";

export default function DocumentsPage() {
  return <UpgradeWall info={gatedRoutes["/documents"]} />;
}
