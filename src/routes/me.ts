import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { buildHistory } from "../lib/academics";
import { listConversations } from "../lib/chat";
import { evaluationList } from "../lib/evaluations";
import { notFound, oid, paging, parse, rx, str } from "../lib/http";
import {
  ClubMember,
  Enrollment,
  Event,
  Invoice,
  Notice,
  Notification,
  Semester,
  TransportPass,
  User,
} from "../models";

const r = Router();

async function newStudentId() {
  for (;;) {
    const id = `${String(new Date().getFullYear()).slice(2)}${Math.floor(10000 + Math.random() * 90000)}`;
    if (!(await User.exists({ studentId: id }))) return id;
  }
}

/** Fills in the fields BetterAuth does not create (role, student ID) the first time we see an account. */
async function ensureProfile(id: string) {
  const u: any = await User.findById(id).lean();
  if (!u) throw notFound("We could not find your account");
  const patch: any = {};
  if (!u.role) patch.role = "student";
  if (!u.studentId && u.role !== "admin") patch.studentId = await newStudentId();
  if (Object.keys(patch).length) {
    await User.updateOne({ _id: id }, { $set: patch });
    Object.assign(u, patch);
  }
  return u;
}

const publicUser = (u: any) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  image: u.image ?? null,
  role: u.role ?? "student",
  studentId: u.studentId ?? null,
  department: u.department ?? null,
  batch: u.batch ?? null,
  phone: u.phone ?? null,
  bio: u.bio ?? null,
  interests: u.interests ?? [],
  social: u.social ?? {},
  waiverPercent: u.waiverPercent ?? 0,
  createdAt: u.createdAt ?? null,
});

r.get("/me", requireAuth, async (req, res) => {
  res.json(publicUser(await ensureProfile(req.user!.id)));
});

const url = z.union([z.literal(""), z.string().trim().url("Enter a full link starting with https://")]);
r.patch("/me", requireAuth, async (req, res) => {
  const body = parse(
    z.object({
      name: z.string().trim().min(2, "Your name needs at least 2 letters").max(80).optional(),
      image: url.optional(),
      bio: z.string().trim().max(400, "Keep your bio under 400 characters").optional(),
      phone: z.string().trim().max(24).optional(),
      department: z.string().trim().max(60).optional(),
      batch: z.string().trim().max(20).optional(),
      interests: z.array(z.string().trim().min(1).max(30)).max(8, "Pick up to 8 interests").optional(),
      social: z.object({ facebook: url.optional(), linkedin: url.optional(), github: url.optional(), x: url.optional() }).optional(),
    }),
    req.body,
  );
  await User.updateOne({ _id: req.user!.id }, { $set: body });
  res.json(publicUser(await ensureProfile(req.user!.id)));
});

/* ------------------------------------------------------------------ dashboard */
r.get("/dashboard", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const now = new Date();
  const user = await ensureProfile(me);
  const [history, ongoing, regSem, notices, events, dues, unreadN, convs, memberships, pass, evals]: any[] = await Promise.all([
    buildHistory(me),
    Semester.findOne({ status: "ongoing" }).select("name startDate endDate").lean(),
    Semester.findOne({ registrationOpen: true }).sort({ startDate: -1 }).select("name registrationDeadline").lean(),
    Notice.find().sort({ pinned: -1, publishedAt: -1 }).limit(4).select("title category priority pinned publishedAt").lean(),
    Event.find({ endAt: { $gte: now } }).sort({ startAt: 1 }).limit(3).select("title category image venue startAt capacity registered").lean(),
    Invoice.find({ student: me, status: { $in: ["unpaid", "partial"] } }).sort({ dueDate: 1 }).limit(4).lean(),
    Notification.countDocuments({ user: me, read: false }),
    listConversations(me),
    ClubMember.find({ student: me }).populate("club", "name image category").lean(),
    TransportPass.findOne({ student: me, status: "active" }).populate("route", "name busNo").lean(),
    evaluationList(me),
  ]);
  const current: any[] = ongoing
    ? ((await Enrollment.find({ student: me, semester: ongoing._id, status: "enrolled" })
        .populate("course", "code title credits category")
        .populate("section", "name instructor schedule")
        .lean()) as any)
    : [];
  const registered = regSem ? !!(await Enrollment.exists({ student: me, semester: regSem._id, status: "enrolled" })) : false;
  const routine = current.flatMap((e) =>
    (e.section?.schedule ?? []).map((s: any) => ({
      day: s.day,
      start: s.start,
      end: s.end,
      room: s.room,
      code: e.course?.code,
      title: e.course?.title,
      instructor: e.section?.instructor?.name,
    })),
  );
  const dueAmount = await Invoice.aggregate([
    { $match: { student: me, status: { $in: ["unpaid", "partial"] } } },
    { $group: { _id: null, due: { $sum: { $subtract: ["$total", "$paid"] } } } },
  ]);
  res.json({
    user: publicUser(user),
    stats: {
      cgpa: history.cgpa,
      creditsEarned: history.creditsEarned,
      currentCredits: current.reduce((s, e) => s + (e.course?.credits ?? 0), 0),
      dueAmount: dueAmount[0]?.due ?? 0,
      unreadMessages: convs.reduce((s: number, c: any) => s + c.unread, 0),
      unreadNotifications: unreadN,
      pendingEvaluations: evals.filter((e: any) => !e.done).length,
    },
    semester: ongoing,
    routine,
    currentCourses: current.map((e) => ({ id: String(e.course?._id), code: e.course?.code, title: e.course?.title, credits: e.course?.credits, category: e.course?.category })),
    registration: regSem ? { semester: regSem, registered } : null,
    gpaTrend: history.semesters.filter((s: any) => s.gpa != null).map((s: any) => ({ semester: s.semester.name, gpa: s.gpa })),
    notices,
    events,
    dues,
    clubs: memberships.filter((m: any) => m.club).map((m: any) => m.club),
    pass,
  });
});

/* ------------------------------------------------------------------ notifications */
r.get("/notifications", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const limit = Math.min(60, Number(req.query.limit) || 30);
  const [items, unread] = await Promise.all([Notification.find({ user: me }).sort({ createdAt: -1 }).limit(limit).lean(), Notification.countDocuments({ user: me, read: false })]);
  res.json({ items, unread });
});

r.post("/notifications/read", requireAuth, async (req, res) => {
  const { ids } = parse(z.object({ ids: z.array(z.string()).optional() }), req.body ?? {});
  await Notification.updateMany({ user: req.user!.id, read: false, ...(ids?.length ? { _id: { $in: ids } } : {}) }, { $set: { read: true } });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ student directory */
r.get("/students", requireAuth, async (req, res) => {
  const { page, limit, skip } = paging(req, 24);
  const q: any = { role: { $ne: "admin" }, _id: { $ne: req.user!.id } };
  const s = str(req.query.q);
  if (s) q.$or = [{ name: rx(s) }, { studentId: rx(s) }, { department: rx(s) }];
  const dept = str(req.query.department);
  if (dept) q.department = dept;
  const [items, total, departments]: any[] = await Promise.all([
    User.find(q).sort({ name: 1 }).skip(skip).limit(limit).select("name image department batch studentId bio").lean(),
    User.countDocuments(q),
    User.distinct("department", { role: { $ne: "admin" } }),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), departments: departments.filter(Boolean).sort() });
});

r.get("/students/:id", requireAuth, async (req, res) => {
  const id = oid(req.params.id);
  const u: any = await User.findById(id).lean();
  if (!u) throw notFound("That student was not found");
  const [clubs, ongoing]: any[] = await Promise.all([ClubMember.find({ student: String(id) }).populate("club", "name image category").lean(), Semester.findOne({ status: "ongoing" }).select("_id").lean()]);
  const courses: any[] = ongoing
    ? ((await Enrollment.find({ student: String(id), semester: ongoing._id, status: "enrolled" }).populate("course", "code title").lean()) as any)
    : [];
  const { email, phone, waiverPercent, ...pub } = publicUser(u);
  res.json({
    user: pub,
    clubs: clubs.filter((m: any) => m.club).map((m: any) => ({ ...m.club, role: m.role })),
    courses: courses.filter((e) => e.course).map((e) => ({ id: String(e.course._id), code: e.course.code, title: e.course.title })),
  });
});

export default r;
