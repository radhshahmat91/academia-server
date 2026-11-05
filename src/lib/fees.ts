import { randomBytes } from "node:crypto";

const DAY = 86_400_000;

export const docNo = (prefix: string) => `${prefix}-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
export const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;

export function tuitionBreakdown(fees: any, credits: number, waiverPercent: number) {
  const tuition = fees.perCredit * credits;
  const items = [
    { label: `Tuition, ${credits} credits at ${taka(fees.perCredit)}`, amount: tuition },
    { label: "Registration fee", amount: fees.registration },
    { label: "Library fee", amount: fees.library },
    { label: "Student activity fee", amount: fees.activity },
  ];
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const waiverAmount = Math.round((tuition * waiverPercent) / 100);
  return { items, subtotal, waiverPercent, waiverAmount, total: subtotal - waiverAmount };
}

/** 40 / 30 / 30 split, due 1 week, 5 weeks and 9 weeks from today. */
export function installmentsFor(total: number, from = new Date()) {
  const first = Math.round(total * 0.4);
  const second = Math.round(total * 0.3);
  return [first, second, total - first - second].map((amount, i) => ({
    no: i + 1,
    amount,
    dueDate: new Date(+from + (7 + i * 28) * DAY),
    paid: false,
  }));
}

/** The invoice's due date always points at the first installment that is still unpaid. */
function syncDueDate(inv: any) {
  const next = (inv.installments ?? []).find((i: any) => !i.paid);
  if (next) inv.dueDate = next.dueDate;
}

/** Mutates an invoice document after a successful payment. The caller saves it. */
export function applyPayment(inv: any, amount: number) {
  inv.paid = Math.min(inv.total, (inv.paid ?? 0) + amount);
  inv.status = inv.paid >= inv.total ? "paid" : inv.paid > 0 ? "partial" : "unpaid";
  let running = 0;
  for (const ins of inv.installments ?? []) {
    running += ins.amount;
    ins.paid = inv.paid >= running;
  }
  syncDueDate(inv);
}

export function reversePayment(inv: any, amount: number) {
  inv.paid = Math.max(0, (inv.paid ?? 0) - amount);
  inv.status = inv.paid >= inv.total ? "paid" : inv.paid > 0 ? "partial" : "unpaid";
  let running = 0;
  for (const ins of inv.installments ?? []) {
    running += ins.amount;
    ins.paid = inv.paid >= running;
  }
  syncDueDate(inv);
}

/** The first installment that is not fully covered yet, with the amount still needed to clear it. */
export function nextInstallment(inv: any) {
  if (inv.status === "paid" || inv.status === "cancelled") return null;
  let running = 0;
  for (const ins of inv.installments ?? []) {
    running += ins.amount;
    const need = running - (inv.paid ?? 0);
    if (need > 0) return { no: ins.no, amount: Math.min(need, inv.total - inv.paid), dueDate: ins.dueDate };
  }
  return null;
}
