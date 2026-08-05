import { UpgradeWall } from "@/components/upgrade-wall";
import { gatedRoutes } from "@/lib/plan";

export default function WorkersPage() {
  return <UpgradeWall info={gatedRoutes["/workers"]} />;
}
