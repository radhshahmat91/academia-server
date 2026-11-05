import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { applyPayment, docNo, nextInstallment, taka } from "../lib/fees";
import { conflict, notFound, oid, parse } from "../lib/http";
import { notify } from "../lib/notify";
import { activatePass } from "../lib/transport";
import { Invoice, Payment, Semester, TransportPass, TransportRoute, User } from "../models";

const r = Router();
const DAY = 86_400_000;

/* ------------------------------------------------------------------ fees */
r.get("/fees", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const now = new Date();
  const [invoices, payments]: any[] = await Promise.all([
    Invoice.find({ student: me, status: { $ne: "cancelled" } }).populate("semester", "name").sort({ createdAt: -1 }).lean(),
    Payment.find({ student: me, status: { $in: ["success", "refunded"] } }).populate("invoice", "number title type").sort({ paidAt: -1 }).limit(60).lean(),
  ]);
  const items = invoices.map((i: any) => {
    const next = nextInstallment(i);
    return {
      ...i,
      due: i.total - i.paid,
      // Overdue means the next unpaid installment (or the whole bill, when it has no installments) is past its date
      overdue: i.status !== "paid" && new Date(next?.dueDate ?? i.dueDate) < now,
      next,
    };
  });
  res.json({
    invoices: items,
    payments,
    totals: {
      billed: items.reduce((s: number, i: any) => s + i.total, 0),
      paid: items.reduce((s: number, i: any) => s + i.paid, 0),
      due: items.reduce((s: number, i: any) => s + i.due, 0),
    },
  });
});

r.get("/fees/invoices/:id", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const inv: any = await Invoice.findOne({ _id: oid(req.params.id), student: me }).populate("semester", "name").lean();
  if (!inv) throw notFound("Invoice not found");
  const [payments, student]: any[] = await Promise.all([
    Payment.find({ invoice: inv._id, status: { $in: ["success", "refunded"] } }).sort({ paidAt: -1 }).lean(),
    User.findById(me).select("name studentId department").lean(),
  ]);
  res.json({ invoice: { ...inv, due: inv.total - inv.paid, next: nextInstallment(inv) }, payments, student });
});

/* ------------------------------------------------------------------ sandbox payment gateway */
r.post("/payments/checkout", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const { invoiceId, mode } = parse(z.object({ invoiceId: z.string(), mode: z.enum(["next", "full"]) }), req.body);
  const inv: any = await Invoice.findOne({ _id: oid(invoiceId), student: me });
  if (!inv) throw notFound("Invoice not found");
  if (inv.status === "paid") throw conflict("This invoice is already paid");
  if (inv.status === "cancelled") throw conflict("This invoice was cancelled");
  const next = nextInstallment(inv);
  const amount = mode === "full" || !next ? inv.total - inv.paid : next.amount;
  await Payment.deleteMany({ invoice: inv._id, student: me, status: "pending" });
  const pay = await Payment.create({
    invoice: inv._id,
    student: me,
    amount,
    status: "pending",
    txnId: docNo("TXN"),
    installmentNo: mode === "next" ? next?.no : undefined,
  });
  res.status(201).json({ paymentId: String(pay._id), txnId: pay.txnId, amount, invoice: { id: String(inv._id), number: inv.number, title: inv.title } });
});

const SANDBOX_CODE = "123456";
const confirmSchema = z.object({
  method: z.enum(["wallet", "card", "bank"]),
  payerRef: z.string().trim().min(4, "Enter the payment details").max(30),
  code: z.string().trim().length(6, "Enter the 6 digit verification code"),
});

r.post("/payments/:id/confirm", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const body = parse(confirmSchema, req.body);
  if (body.method === "wallet" && !/^01\d{9}$/.test(body.payerRef)) throw conflict("Enter an 11 digit mobile number that starts with 01");
  if (body.method === "card" && !/^\d{4}$/.test(body.payerRef)) throw conflict("Enter the last 4 digits of the card");
  if (body.code !== SANDBOX_CODE) throw conflict(`That verification code is not right. The demo gateway code is ${SANDBOX_CODE}.`);

  const claimed: any = await Payment.findOneAndUpdate(
    { _id: oid(req.params.id), student: me, status: "pending" },
    {
      $set: {
        status: "success",
        method: body.method,
        payerRef: body.method === "wallet" ? `${body.payerRef.slice(0, 3)}••••${body.payerRef.slice(-3)}` : body.method === "card" ? `•••• ${body.payerRef}` : body.payerRef,
        paidAt: new Date(),
        receiptNo: docNo("RCT"),
      },
    },
    { new: true },
  );
  if (!claimed) throw conflict("This payment was already processed or has expired");
  const inv: any = await Invoice.findById(claimed.invoice);
  if (!inv || inv.status === "cancelled" || inv.paid >= inv.total) {
    await Payment.updateOne({ _id: claimed._id }, { $set: { status: "failed" } });
    throw conflict("This invoice can no longer accept payments");
  }
  const amount = Math.min(claimed.amount, inv.total - inv.paid);
  if (amount !== claimed.amount) await Payment.updateOne({ _id: claimed._id }, { $set: { amount } });
  applyPayment(inv, amount);
  await inv.save();
  if (inv.type === "transport" && inv.status === "paid") await activatePass(inv);
  await notify(me, {
    type: "payment",
    title: "Payment received",
    body: `${taka(amount)} for ${inv.title}. Receipt ${claimed.receiptNo}.`,
    link: `/receipt/${claimed._id}`,
  });
  res.json({ paymentId: String(claimed._id), invoiceStatus: inv.status, paid: inv.paid, due: inv.total - inv.paid });
});

r.get("/payments/:id", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const payment: any = await Payment.findOne({ _id: oid(req.params.id), student: me, status: { $in: ["success", "refunded"] } }).populate("invoice").lean();
  if (!payment) throw notFound("Receipt not found");
  const student = await User.findById(me).select("name email studentId department batch").lean();
  res.json({ payment, student });
});

/* ------------------------------------------------------------------ transport */
r.get("/transport/routes", async (_req, res) => {
  const routes: any[] = await TransportRoute.find({ active: true }).sort({ name: 1 }).lean();
  res.json({ items: routes.map((x) => ({ ...x, seatsLeft: Math.max(0, x.capacity - x.enrolled) })) });
});

const targetSemester = () => Semester.findOne({ status: { $in: ["registration", "ongoing"] } }).sort({ startDate: -1 }).lean() as Promise<any>;

r.get("/transport/pass", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const [passes, target]: any[] = await Promise.all([
    TransportPass.find({ student: me, status: { $ne: "cancelled" } })
      .populate("route", "name code busNo stops fee")
      .populate("semester", "name startDate endDate")
      .populate("invoice", "number total paid status dueDate")
      .sort({ createdAt: -1 })
      .lean(),
    targetSemester(),
  ]);
  const student = await User.findById(me).select("name studentId department").lean();
  res.json({ passes, target: target ? { id: String(target._id), name: target.name } : null, student });
});

r.post("/transport/pass", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const { routeId, stop } = parse(z.object({ routeId: z.string(), stop: z.string().trim().min(1, "Choose your pickup stop") }), req.body);
  const sem = await targetSemester();
  if (!sem) throw conflict("Bus passes are not open right now");
  if (await TransportPass.exists({ student: me, semester: sem._id, status: { $ne: "cancelled" } })) throw conflict(`You already have a bus pass for ${sem.name}`);
  const route: any = await TransportRoute.findOne({ _id: oid(routeId), active: true }).lean();
  if (!route) throw notFound("That route is not available");
  if (!route.stops.some((s: any) => s.name === stop)) throw conflict("That stop is not on this route");
  const seat = await TransportRoute.findOneAndUpdate({ _id: route._id, $expr: { $lt: ["$enrolled", "$capacity"] } }, { $inc: { enrolled: 1 } });
  if (!seat) throw conflict("This route is full. Try another route.");
  const invoice = await Invoice.create({
    number: docNo("INV"),
    student: me,
    semester: sem._id,
    type: "transport",
    title: `Bus pass, ${route.name}, ${sem.name}`,
    items: [{ label: `Semester bus pass, ${route.name}`, amount: route.fee }],
    subtotal: route.fee,
    total: route.fee,
    dueDate: new Date(Date.now() + 7 * DAY),
    refKind: "transport",
  });
  const pass = await TransportPass.create({ student: me, semester: sem._id, route: route._id, stop, status: "pending", passNo: docNo("BUS"), invoice: invoice._id });
  await Invoice.updateOne({ _id: invoice._id }, { $set: { refId: String(pass._id) } });
  await notify(me, { type: "transport", title: "Bus pass requested", body: `Pay ${taka(route.fee)} to activate your pass for ${route.name}.`, link: "/transport" });
  res.status(201).json({ passId: String(pass._id), invoiceId: String(invoice._id) });
});

r.delete("/transport/pass/:id", requireAuth, async (req, res) => {
  const pass: any = await TransportPass.findOne({ _id: oid(req.params.id), student: req.user!.id });
  if (!pass) throw notFound("Bus pass not found");
  const inv: any = await Invoice.findById(pass.invoice);
  if (inv && inv.paid > 0) throw conflict("This pass has already been paid for. Ask the transport office to cancel it.");
  pass.status = "cancelled";
  await pass.save();
  if (inv) await Invoice.updateOne({ _id: inv._id }, { $set: { status: "cancelled" } });
  await TransportRoute.updateOne({ _id: pass.route, enrolled: { $gt: 0 } }, { $inc: { enrolled: -1 } });
  res.json({ ok: true });
});

export default r;
