export type PerfumeSnapshot = {
  perfumeId: number | null;
  name: string;
  image: string | null;
  brand: { id: string; name: string } | null;
  volumeMl?: number;
};

export type SaleItemRow = {
  id: string;
  saleId: string;
  perfumeId: number | null;
  perfumeSnapshot: PerfumeSnapshot;
  quantity: number;
  volumeMl: number | null;
  unitPrice: string;
  unitCost: string;
  lineRevenue: string;
  lineCost: string;
  lineMargin: string;
  perfume: {
    id: number;
    name: string;
    image: string;
    brand: { id: string; name: string };
  } | null;
};

export type SaleRow = {
  id: string;
  orderId: string | null;
  customerName: string | null;
  soldAt: string;
  totalRevenue: string;
  totalCost: string;
  totalMargin: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: SaleItemRow[];
  order: { id: string; customerName: string | null; orderedAt: string } | null;
};

export type OrderItemRow = {
  id: string;
  orderId: string;
  perfumeId: number;
  quantity: number;
  note: string | null;
  volumeMl: number;
  unitPrice: string;
  unitCost: string;
  perfume: {
    id: number;
    name: string;
    image: string;
    brand: { id: string; name: string };
  } | null;
};

export type OrderStatusValue = "PENDING" | "READY" | "DELIVERED" | "CANCELLED";

export type OrderRow = {
  id: string;
  customerName: string | null;
  orderedAt: string;
  deliveryAt: string | null;
  status: OrderStatusValue;
  notes: string | null;
  depositPaid: boolean;
  depositAmount: string;
  orderTotal: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRow[];
  sale: { id: string; soldAt: string } | null;
};

export type PerfumePickerRow = {
  id: number;
  name: string;
  image: string;
  status: string;
  brand: { id: string; name: string };
};

export type StatsResponse = {
  period: "week" | "month" | "all";
  count: number;
  totalRevenue: string;
  totalCost: string;
  totalMargin: string;
  averageSale: string;
};

export type PeriodValue = "week" | "month" | "all";
