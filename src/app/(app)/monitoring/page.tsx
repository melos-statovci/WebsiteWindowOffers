import { UpgradeWall } from "@/components/upgrade-wall";
import { gatedRoutes } from "@/lib/plan";

export default function MonitoringPage() {
  return <UpgradeWall info={gatedRoutes["/monitoring"]} />;
}
