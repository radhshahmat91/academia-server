import { Router, type Request } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../auth";
import { gradeFor } from "../lib/academics";
import { reversePayment, applyPayment, docNo, taka } from "../lib/fees";
import { bad, conflict, notFound, oid, paging, parse, rx, str } from "../lib/http";
import { notify } from "../lib/notify";
import { activatePass } from "../lib/transport";
import {
  Club,
  ClubMember,
  ContactMessage,
  Conversation,
  Course,
  Enrollment,
  Evaluation,
  Event,
  EventRegistration,
  Invoice,
  Notice,
  Payment,
  Section,
  Semester,
  TransportPass,
  TransportRoute,
  User,
} from "../models";

const r = Router();
r.use("/admin", requireAuth, requireAdmin);

/* ------------------------------------------------------------------ generic CRUD */
type Opts = {
  search?: string[];
  sort?: any;
  populate?: any;
  filters?: string[];
  protect?: string[];
  onCreate?: (doc: any, req: Request) => Promise<void>;
  beforeDelete?: (doc: any) => Promise<void>;
};

function crud(path: string, Model: any, o: Opts = {}) {
  const protect = ["id", "_id", "__v", "createdAt", "updatedAt", ...(o.protect ?? [])];
  const clean = (b: any) => {
    const out = { ...(b ?? {}) };
    for (const k of protect) delete out[k];
    return out;
  };
  r.get(`/admin/${path}`, async (req, res) => {
    const { page, limit, skip } = paging(req, 20);
    const q: any = {};
    const s = str(req.query.q);
    if (s && o.search?.length) q.$or = o.search.map((f) => ({ [f]: rx(s) }));
    for (const f of o.filters ?? []) {
      const v = str(req.query[f]);
      if (v) q[f] = v;
    }
    let cur = Model.find(q)
      .sort(o.sort ?? { createdAt: -1 })
      .skip(skip)
      .limit(limit);
    if (o.populate) cur = cur.populate(o.populate);
    const [items, total] = await Promise.all([cur.lean(), Model.countDocuments(q)]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  });
  r.get(`/admin/${path}/:id`, async (req, res) => {
    const doc = await Model.findById(oid(req.params.id)).lean();
    if (!doc) throw notFound();
    res.json(doc);
  });
  r.post(`/admin/${path}`, async (req, res) => {
    const doc = await Model.create(clean(req.body));
    if (o.onCreate) await o.onCreate(doc, req);
    res.status(201).json(doc);
  });
  r.patch(`/admin/${path}/:id`, async (req, res) => {
    const doc = await Model.findByIdAndUpdate(oid(req.params.id), { $set: clean(req.body) }, { new: true, runValidators: true });
    if (!doc) throw notFound();
    res.json(doc);
  });
  r.delete(`/admin/${path}/:id`, async (req, res) => {
    const doc = await Model.findById(oid(req.params.id));
    if (!doc) throw notFound();
    if (o.beforeDelete) await o.beforeDelete(doc);
    await doc.deleteOne();
    res.json({ ok: true });
  });
}

crud("courses", Course, {
  search: ["code", "title", "department"],
  sort: { code: 1 },
  beforeDelete: async (c) => {
    if (await Enrollment.exists({ course: c._id })) throw conflict("This course has enrollments, so it can't be deleted");
    await Section.deleteMany({ course: c._id });
  },
});
crud("clubs", Club, {
  search: ["name", "category"],
  sort: { name: 1 },
  beforeDelete: async (c) => {
    await ClubMember.deleteMany({ club: c._id });
    await Conversation.deleteOne({ refKind: "club", refId: String(c._id) });
  },
});
crud("events", Event, {
  search: ["title", "category", "venue"],
  sort: { startAt: -1 },
  protect: ["registered"],
  populate: { path: "club", select: "name" },
  beforeDelete: async (e) => {
    await EventRegistration.deleteMany({ event: e._id });
  },
});
crud("notices", Notice, {
  search: ["title", "category"],
  sort: { publishedAt: -1 },
  onCreate: async (n) => {
    const students = (await User.find({ role: { $ne: "admin" } }).select("_id").lean()) as any[];
    await notify(students.map((s) => String(s._id)), {
      type: "notice",
      title: n.priority === "urgent" ? `Urgent: ${n.title}` : n.title,
      body: n.category,
      link: `/notices/${n._id}`,
    });
  },
});
crud("semesters", Semester, {
  search: ["name"],
  sort: { startDate: -1 },
  beforeDelete: async (s) => {
    if (await Enrollment.exists({ semester: s._id })) throw conflict("This semester has enrollments, so it can't be deleted");
    await Section.deleteMany({ semester: s._id });
  },
});
crud("sections", Section, {
  sort: { createdAt: -1 },
  filters: ["semester", "course"],
  protect: ["enrolled"],
  populate: [
    { path: "course", select: "code title credits" },
    { path: "semester", select: "name" },
  ],
  beforeDelete: async (s) => {
    if (await Enrollment.exists({ section: s._id })) throw conflict("Students are enrolled in this section, so it can't be deleted");
  },
});
crud("routes", TransportRoute, {
  search: ["name", "code", "busNo"],
  sort: { name: 1 },
  protect: ["enrolled"],
  beforeDelete: async (x) => {
    if (await TransportPass.exists({ route: x._id, status: { $in: ["pending", "active"] } })) throw conflict("Students hold passes on this route. Deactivate it instead of deleting.");
  },
});

/* ------------------------------------------------------------------ users */
r.get("/admin/users", async (req, res) => {
  const { page, limit, skip } = paging(req, 20);
  const q: any = {};
  const s = str(req.query.q);
  if (s) q.$or = [{ name: rx(s) }, { email: rx(s) }, { studentId: rx(s) }];
  const role = str(req.query.role);
  if (role) q.role = role;
  const [items, total] = await Promise.all([
    User.find(q).sort({ name: 1 }).skip(skip).limit(limit).select("name email image role studentId department batch waiverPercent createdAt").lean(),
    User.countDocuments(q),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

r.patch("/admin/users/:id", async (req, res) => {
  const body = parse(
    z.object({
      role: z.enum(["student", "admin"]).optional(),
      name: z.string().trim().min(2).max(80).optional(),
      studentId: z.string().trim().max(20).optional(),
      department: z.string().trim().max(60).optional(),
      batch: z.string().trim().max(20).optional(),
      waiverPercent: z.number().min(0, "Waiver can't be negative").max(100, "Waiver can't be above 100%").optional(),
    }),
    req.body,
  );
  const id = oid(req.params.id);
  if (String(id) === req.user!.id && body.role && body.role !== "admin") throw conflict("You can't remove your own admin access");
  await User.updateOne({ _id: id }, { $set: body });
  const u = await User.findById(id).select("name email image role studentId department batch waiverPercent").lean();
  if (!u) throw notFound("User not found");
  res.json(u);
});

/* ------------------------------------------------------------------ grades */
r.get("/admin/enrollments", async (req, res) => {
  const section = str(req.query.section);
  if (!section) throw bad("Choose a section first");
  const rows: any[] = await Enrollment.find({ section: oid(section), status: { $ne: "dropped" } }).lean();
  const users: any[] = await User.find({ _id: { $in: rows.map((x) => x.student) } }).select("name studentId image").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json({
    items: rows
      .map((x) => ({ ...x, studentName: byId.get(x.student)?.name ?? "Student", studentCode: byId.get(x.student)?.studentId ?? "" }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName)),
  });
});

r.patch("/admin/enrollments/:id", async (req, res) => {
  const { marks } = parse(z.object({ marks: z.number().min(0, "Marks can't be negative").max(100, "Marks are out of 100") }), req.body);
  const g = gradeFor(marks);
  const e: any = await Enrollment.findByIdAndUpdate(oid(req.params.id), { $set: { marks, grade: g.grade, gradePoint: g.point, status: "completed" } }, { new: true }).populate("course", "code");
  if (!e) throw notFound();
  await notify(e.student, { type: "result", title: `Result updated for ${e.course?.code ?? "your course"}`, body: "Open Semester wise courses to see your grade.", link: "/my-courses" });
  res.json(e);
});

/* ------------------------------------------------------------------ money */
r.get("/admin/invoices", async (req, res) => {
  const { page, limit, skip } = paging(req, 20);
  const q: any = {};
  const status = str(req.query.status);
  if (status) q.status = status;
  const type = str(req.query.type);
  if (type) q.type = type;
  const s = str(req.query.q);
  if (s) {
    const users: any[] = await User.find({ $or: [{ name: rx(s) }, { studentId: rx(s) }] }).select("_id").lean();
    q.$or = [{ number: rx(s) }, { student: { $in: users.map((u) => String(u._id)) } }];
  }
  const [rows, total]: any[] = await Promise.all([
    Invoice.find(q).populate("semester", "name").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Invoice.countDocuments(q),
  ]);
  const users: any[] = await User.find({ _id: { $in: rows.map((x: any) => x.student) } }).select("name studentId").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json({
    items: rows.map((x: any) => ({ ...x, due: x.total - x.paid, studentName: byId.get(x.student)?.name ?? "Student", studentCode: byId.get(x.student)?.studentId ?? "" })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

r.post("/admin/invoices/:id/payments", async (req, res) => {
  const { amount, note } = parse(z.object({ amount: z.number().positive("Enter an amount above zero"), note: z.string().trim().max(120).optional() }), req.body);
  const inv: any = await Invoice.findById(oid(req.params.id));
  if (!inv || inv.status === "cancelled") throw notFound("Invoice not found");
  const due = inv.total - inv.paid;
  if (due <= 0) throw conflict("This invoice is already paid");
  if (amount > due) throw bad(`The amount is more than the ${taka(due)} still due`);
  const pay = await Payment.create({
    invoice: inv._id,
    student: inv.student,
    amount,
    method: "bank",
    status: "success",
    txnId: docNo("CSH"),
    receiptNo: docNo("RCT"),
    payerRef: note || "Accounts office",
    paidAt: new Date(),
  });
  applyPayment(inv, amount);
  await inv.save();
  if (inv.type === "transport" && inv.status === "paid") await activatePass(inv);
  await notify(inv.student, { type: "payment", title: "Payment recorded", body: `${taka(amount)} for ${inv.title}.`, link: `/receipt/${pay._id}` });
  res.status(201).json({ invoice: inv, payment: pay });
});

r.get("/admin/payments", async (req, res) => {
  const { page, limit, skip } = paging(req, 20);
  const q: any = {};
  const status = str(req.query.status);
  if (status) q.status = status;
  const s = str(req.query.q);
  if (s) q.$or = [{ txnId: rx(s) }, { receiptNo: rx(s) }];
  const [rows, total]: any[] = await Promise.all([
    Payment.find(q).populate("invoice", "number title type").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(q),
  ]);
  const users: any[] = await User.find({ _id: { $in: rows.map((x: any) => x.student) } }).select("name studentId").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json({
    items: rows.map((x: any) => ({ ...x, studentName: byId.get(x.student)?.name ?? "Student", studentCode: byId.get(x.student)?.studentId ?? "" })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

r.post("/admin/payments/:id/refund", async (req, res) => {
  const pay: any = await Payment.findById(oid(req.params.id));
  if (!pay) throw notFound();
  if (pay.status !== "success") throw conflict("Only successful payments can be refunded");
  const inv: any = await Invoice.findById(pay.invoice);
  pay.status = "refunded";
  await pay.save();
  if (inv) {
    reversePayment(inv, pay.amount);
    await inv.save();
    if (inv.type === "transport") {
      const pass: any = await TransportPass.findOne({ invoice: inv._id });
      if (pass && pass.status === "active") {
        pass.status = "pending";
        await pass.save();
      }
    }
  }
  await notify(pay.student, { type: "payment", title: "Payment refunded", body: `${taka(pay.amount)} was refunded (${pay.receiptNo}).`, link: "/fees" });
  res.json(pay);
});

r.get("/admin/passes", async (req, res) => {
  const { page, limit, skip } = paging(req, 20);
  const q: any = {};
  const status = str(req.query.status);
  if (status) q.status = status;
  const [rows, total]: any[] = await Promise.all([
    TransportPass.find(q).populate("route", "name busNo").populate("semester", "name").populate("invoice", "number status total paid").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    TransportPass.countDocuments(q),
  ]);
  const users: any[] = await User.find({ _id: { $in: rows.map((x: any) => x.student) } }).select("name studentId").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json({ items: rows.map((x: any) => ({ ...x, studentName: byId.get(x.student)?.name ?? "Student", studentCode: byId.get(x.student)?.studentId ?? "" })), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

/* ------------------------------------------------------------------ evaluations (anonymous) */
r.get("/admin/evaluations", async (req, res) => {
  const semester = str(req.query.semester);
  const rows: any[] = await Evaluation.find(semester ? { semester: oid(semester) } : {})
    .select("-student")
    .populate("course", "code title")
    .populate("section", "name instructor enrolled")
    .populate("semester", "name")
    .lean();
  const groups = new Map<string, any>();
  for (const e of rows) {
    if (!e.section || !e.course) continue;
    const key = String(e.section._id);
    if (!groups.has(key)) groups.set(key, { sectionId: key, course: e.course, section: e.section, semester: e.semester, count: 0, sums: {} as Record<string, number>, comments: [] as string[] });
    const g = groups.get(key);
    g.count++;
    for (const [k, v] of Object.entries(e.ratings ?? {})) g.sums[k] = (g.sums[k] ?? 0) + Number(v);
    if (e.comment) g.comments.push(e.comment);
  }
  const items = [...groups.values()]
    .map((g) => {
      const averages = Object.fromEntries(Object.entries(g.sums).map(([k, v]) => [k, Math.round(((v as number) / g.count) * 100) / 100]));
      const vals = Object.values(averages) as number[];
      return {
        sectionId: g.sectionId,
        course: g.course,
        section: { id: String(g.section._id), name: g.section.name, instructor: g.section.instructor, enrolled: g.section.enrolled },
        semester: g.semester,
        responses: g.count,
        responseRate: g.section.enrolled ? Math.round((g.count / g.section.enrolled) * 100) : null,
        averages,
        overall: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null,
        comments: g.comments.slice(0, 8),
      };
    })
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  res.json({ items });
});

r.get("/admin/messages", async (_req, res) => {
  res.json({ items: await ContactMessage.find().sort({ createdAt: -1 }).limit(50).lean() });
});

/* ------------------------------------------------------------------ overview */
r.get("/admin/stats", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [students, courses, clubs, events, notices, enrollments, byMonth, byMethod, dues, regs, recent, openEvals, pendingPasses]: any[] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    Course.countDocuments(),
    Club.countDocuments(),
    Event.countDocuments({ endAt: { $gte: now } }),
    Notice.countDocuments(),
    Enrollment.countDocuments({ status: "enrolled" }),
    Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } }, amount: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: "$method", amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Invoice.aggregate([{ $match: { status: { $in: ["unpaid", "partial"] } } }, { $group: { _id: null, due: { $sum: { $subtract: ["$total", "$paid"] } }, count: { $sum: 1 } } }]),
    Enrollment.aggregate([{ $match: { status: { $in: ["enrolled", "completed"] } } }, { $group: { _id: "$semester", n: { $sum: 1 } } }, { $lookup: { from: "semesters", localField: "_id", foreignField: "_id", as: "s" } }, { $unwind: "$s" }, { $project: { name: "$s.name", start: "$s.startDate", n: 1 } }, { $sort: { start: 1 } }]),
    Payment.find({ status: { $in: ["success", "refunded"] } }).populate("invoice", "title type").sort({ paidAt: -1 }).limit(6).lean(),
    Evaluation.countDocuments(),
    TransportPass.countDocuments({ status: "pending" }),
  ]);
  const total = byMonth.reduce((s: number, m: any) => s + m.amount, 0);
  const thisKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  const users: any[] = await User.find({ _id: { $in: recent.map((p: any) => p.student) } }).select("name studentId").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json({
    counts: { students, courses, clubs, upcomingEvents: events, notices, activeEnrollments: enrollments, evaluations: openEvals, pendingPasses },
    revenue: {
      total,
      thisMonth: byMonth.find((m: any) => m._id === thisKey)?.amount ?? 0,
      byMonth: byMonth.slice(-8).map((m: any) => ({ month: m._id, amount: m.amount, payments: m.count })),
      byMethod: byMethod.map((m: any) => ({ method: m._id ?? "other", amount: m.amount, payments: m.count })),
    },
    outstanding: { amount: dues[0]?.due ?? 0, invoices: dues[0]?.count ?? 0 },
    registrations: regs.map((x: any) => ({ semester: x.name, enrollments: x.n })),
    recentPayments: recent.map((p: any) => ({ ...p, studentName: byId.get(p.student)?.name ?? "Student" })),
  });
});

export default r;
