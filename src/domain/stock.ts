/** Seuil d'alerte stock bas (unités). */
export const LOW_STOCK_THRESHOLD = 3;

export type StockStatus = "out" | "low" | "ok";

export function stockStatus(stock: number, threshold = LOW_STOCK_THRESHOLD): StockStatus {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "ok";
}

export function stockLabel(status: StockStatus): string {
  switch (status) {
    case "out":
      return "Rupture";
    case "low":
      return "Stock bas";
    default:
      return "En stock";
  }
}
