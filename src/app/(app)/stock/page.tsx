import { UpgradeWall } from "@/components/upgrade-wall";
import { gatedRoutes } from "@/lib/plan";

export default function StockPage() {
  return <UpgradeWall info={gatedRoutes["/stock"]} />;
}
