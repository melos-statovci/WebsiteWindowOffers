import { UpgradeWall } from "@/components/upgrade-wall";
import { gatedRoutes } from "@/lib/plan";

export default function JobsPage() {
  return <UpgradeWall info={gatedRoutes["/jobs"]} />;
}
