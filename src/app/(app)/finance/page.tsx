import { UpgradeWall } from "@/components/upgrade-wall";
import { gatedRoutes } from "@/lib/plan";

export default function FinancePage() {
  return <UpgradeWall info={gatedRoutes["/finance"]} />;
}
