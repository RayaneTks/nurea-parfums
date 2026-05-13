"use client";

const STORAGE_KEY = "nurea_pricing_memory_v2";

type PricingEntry = {
  unitPrice: string;
  unitCostDzd: string;
  exchangeRate: string;
};

// key is formatted as `${perfumeId}_${volumeMl}`
type PricingMemoryStore = Record<string, PricingEntry>;

function getStore(): PricingMemoryStore {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function savePricingMemory(perfumeId: number, volumeMl: number, unitPrice: string, unitCostDzd: string, exchangeRate: string) {
  if (typeof window === "undefined") return;
  const price = unitPrice.trim();
  const dzd = unitCostDzd.trim();
  const rate = exchangeRate.trim();
  
  if (!price && !dzd && !rate) return; // Don't save empty values
  
  const store = getStore();
  store[`${perfumeId}_${volumeMl}`] = {
    unitPrice: price,
    unitCostDzd: dzd,
    exchangeRate: rate,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors (e.g., quota exceeded, private browsing)
  }
}

export function getPricingMemory(perfumeId: number, volumeMl: number): PricingEntry | null {
  const store = getStore();
  return store[`${perfumeId}_${volumeMl}`] || null;
}
