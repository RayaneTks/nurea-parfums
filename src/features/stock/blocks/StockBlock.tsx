import { availableBottles } from "@/server/stock/queries";
import { StockView } from "../components/StockView";

/** E23 — les flacons disponibles, les plus récents d'abord. */
export async function StockBlock() {
  return <StockView bottles={await availableBottles()} />;
}
