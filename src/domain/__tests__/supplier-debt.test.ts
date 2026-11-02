import { describe, expect, it } from "vitest";
import { dzd, dzdFromDb, formatDzd, toDb } from "../money";
import {
  allocateSupplierPayments,
  supplierBalanceState,
  supplierRemaining,
  type SupplierAllocationEntry,
  type SupplierEntryKind,
} from "../supplier-debt";

const entry = (kind: SupplierEntryKind, amount: string) => ({ kind, amountDzd: dzdFromDb(amount) });

describe("carnet fournisseur : reste à payer", () => {
  it("dettes moins versements, au centime, quel que soit l'ordre", () => {
    const remaining = supplierRemaining([
      entry("DEBT", "92700.00"),
      entry("PAYMENT", "60000.00"),
      entry("DEBT", "15600.50"),
      entry("PAYMENT", "0.25"),
    ]);
    expect(toDb(remaining)).toBe("48300.25");
    expect(supplierBalanceState(remaining)).toBe("due");
  });

  it("carnet vide ou soldé : rien à payer", () => {
    expect(supplierBalanceState(supplierRemaining([]))).toBe("settled");
    const settled = supplierRemaining([entry("DEBT", "1000.00"), entry("PAYMENT", "1000.00")]);
    expect(toDb(settled)).toBe("0.00");
    expect(supplierBalanceState(settled)).toBe("settled");
  });

  it("versé plus que dû : avance, négative, affichée telle quelle", () => {
    const advance = supplierRemaining([entry("DEBT", "1000.00"), entry("PAYMENT", "1500.00")]);
    expect(toDb(advance)).toBe("-500.00");
    expect(supplierBalanceState(advance)).toBe("advance");
    expect(formatDzd(advance)).toBe("−500 DA");
  });
});

describe("carnet fournisseur : les versements paient les dettes", () => {
  const line = (id: string, kind: SupplierEntryKind, amount: string, day: string, extra: Partial<SupplierAllocationEntry> = {}): SupplierAllocationEntry => ({
    id,
    kind,
    amountDzd: dzdFromDb(amount),
    occurredAt: `2026-${day}T10:00:00.000Z`,
    settlesEntryId: null,
    settled: false,
    ...extra,
  });
  const carnet = [
    line("normen", "DEBT", "3200.00", "10-25"),
    line("kais", "DEBT", "21000.00", "10-27"),
    line("coco", "DEBT", "3600.00", "10-27"),
    line("herman", "DEBT", "8000.00", "10-30"),
    line("toiybou", "DEBT", "19000.00", "11-01"),
  ];

  it("50 000 DA sur 54 800 DA : quatre dettes payées, 4 800 DA restent sur la dernière", () => {
    const versement = line("v", "PAYMENT", "50000.00", "11-02");
    const { debts, payments } = allocateSupplierPayments([...carnet, versement]);
    for (const id of ["normen", "kais", "coco", "herman"]) {
      expect(toDb(debts.get(id)?.remaining ?? dzd.zero)).toBe("0.00");
      expect(debts.get(id)?.paidAt).toBe(versement.occurredAt);
    }
    const last = debts.get("toiybou");
    expect(toDb(last?.paid ?? dzd.zero)).toBe("14200.00");
    expect(toDb(last?.remaining ?? dzd.zero)).toBe("4800.00");
    expect(last?.paidAt).toBeNull();
    expect(payments.get("v")?.debts.map((debt) => debt.id)).toEqual(["normen", "kais", "coco", "herman", "toiybou"]);
    expect(toDb(payments.get("v")?.unallocated ?? dzd.zero)).toBe("0.00");
  });

  it("verser trop laisse une avance, qui paie la dette suivante", () => {
    const first = allocateSupplierPayments([...carnet, line("v", "PAYMENT", "60000.00", "11-02")]);
    expect(toDb(first.payments.get("v")?.unallocated ?? dzd.zero)).toBe("5200.00");

    const later = line("neuve", "DEBT", "5000.00", "11-05");
    const second = allocateSupplierPayments([...carnet, line("v", "PAYMENT", "60000.00", "11-02"), later]);
    expect(second.debts.get("neuve")?.paidAt).toBe(later.occurredAt);
    expect(toDb(second.payments.get("v")?.unallocated ?? dzd.zero)).toBe("200.00");
  });

  it("plusieurs versements s'enchaînent, au centime", () => {
    const { debts } = allocateSupplierPayments([
      line("a", "DEBT", "1000.50", "10-01"),
      line("b", "DEBT", "500.00", "10-02"),
      line("v1", "PAYMENT", "400.25", "10-03"),
      line("v2", "PAYMENT", "700.25", "10-04"),
    ]);
    expect(debts.get("a")?.payments.map((payment) => payment.id)).toEqual(["v1", "v2"]);
    expect(debts.get("a")?.paidAt).not.toBeNull();
    expect(toDb(debts.get("b")?.paid ?? dzd.zero)).toBe("100.00");
    expect(toDb(debts.get("b")?.remaining ?? dzd.zero)).toBe("400.00");
  });

  it("une dette et son remboursement lié restent hors répartition", () => {
    const { debts, payments } = allocateSupplierPayments([
      line("ancienne", "DEBT", "1000.00", "10-01"),
      line("visee", "DEBT", "2000.00", "10-02", { settled: true }),
      line("lien", "PAYMENT", "2000.00", "10-03", { settlesEntryId: "visee" }),
      line("v", "PAYMENT", "400.00", "10-04"),
    ]);
    expect(debts.has("visee")).toBe(false);
    expect(payments.has("lien")).toBe(false);
    expect(toDb(debts.get("ancienne")?.remaining ?? dzd.zero)).toBe("600.00");
  });

  it("les restes moins les avances valent toujours le reste à payer", () => {
    for (const amount of ["1.00", "50000.00", "54800.00", "60000.00"]) {
      const entries = [...carnet, line("v", "PAYMENT", amount, "11-02")];
      const { debts, payments } = allocateSupplierPayments(entries);
      const owed = dzd.sum([...debts.values()].map((debt) => debt.remaining));
      const advance = dzd.sum([...payments.values()].map((payment) => payment.unallocated));
      expect(toDb(dzd.sub(owed, advance))).toBe(toDb(supplierRemaining(entries)));
    }
  });
});
