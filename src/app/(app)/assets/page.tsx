import { UpgradeWall } from "@/components/upgrade-wall";
import { gatedRoutes } from "@/lib/plan";

export default function AssetsPage() {
  return <UpgradeWall info={gatedRoutes["/assets"]} />;
}
