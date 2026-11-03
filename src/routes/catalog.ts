import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { joinGroup, leaveGroup } from "../lib/chat";
import { conflict, notFound, oid, paging, parse, rx, str } from "../lib/http";
import { notify } from "../lib/notify";
import {
  Club,
  ClubMember,
  ContactMessage,
  Conversation,
  Course,
  CourseProgress,
  Enrollment,
  Event,
  EventRegistration,
  Notice,
  Section,
  User,
} from "../models";

const r = Router();
const courseCard = "code title department level credits category image summary prerequisites tags featured";

/* ------------------------------------------------------------------ public stats */
r.get("/public/stats", async (_req, res) => {
  const now = new Date();
  const [students, courses, clubs, events, notices, lectures] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    Course.countDocuments(),
    Club.countDocuments(),
    Event.countDocuments({ endAt: { $gte: now } }),
    Notice.countDocuments(),
    Course.aggregate([{ $project: { n: { $size: { $ifNull: ["$lectures", []] } } } }, { $group: { _id: null, n: { $sum: "$n" } } }]),
  ]);
  res.json({ students, courses, clubs, upcomingEvents: events, notices, lectures: lectures[0]?.n ?? 0 });
});

r.post("/contact", async (req, res) => {
  const body = parse(
    z.object({
      name: z.string().trim().min(2, "Tell us your name").max(80),
      email: z.string().trim().email("Enter a valid email address"),
      subject: z.string().trim().min(3, "Add a short subject").max(120),
      message: z.string().trim().min(10, "Write at least a sentence").max(2000),
    }),
    req.body,
  );
  await ContactMessage.create(body);
  res.status(201).json({ ok: true });
});

/* ------------------------------------------------------------------ courses */
r.get("/courses/meta", async (_req, res) => {
  const [departments, categories, levels] = await Promise.all([Course.distinct("department"), Course.distinct("category"), Course.distinct("level")]);
  res.json({
    departments: departments.filter(Boolean).sort(),
    categories: categories.filter(Boolean).sort(),
    levels: levels.filter(Boolean).sort(),
  });
});

r.get("/courses", async (req, res) => {
  const { page, limit, skip } = paging(req, 12);
  const q: any = {};
  const s = str(req.query.q);
  if (s) q.$or = [{ title: rx(s) }, { code: rx(s) }, { tags: rx(s) }, { summary: rx(s) }];
  for (const k of ["department", "category"]) {
    const v = str(req.query[k]);
    if (v) q[k] = v;
  }
  const level = Number(req.query.level);
  if (level) q.level = level;
  const sorts: Record<string, any> = { code: { code: 1 }, az: { title: 1 }, credits: { credits: -1, code: 1 }, featured: { featured: -1, code: 1 } };
  const [items, total] = await Promise.all([
    Course.find(q)
      .select(`${courseCard} lectures.title notes.title`)
      .sort(sorts[str(req.query.sort)] ?? sorts.code)
      .skip(skip)
      .limit(limit)
      .lean(),
    Course.countDocuments(q),
  ]);
  res.json({
    items: items.map((c: any) => ({ ...c, lectureCount: c.lectures?.length ?? 0, noteCount: c.notes?.length ?? 0, lectures: undefined, notes: undefined })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

r.get("/courses/:id", requireAuth, async (req, res) => {
  const id = oid(req.params.id);
  const me = req.user!.id;
  const course: any = await Course.findById(id).lean();
  if (!course) throw notFound("That course was not found");
  const [sections, progress, enrollment, related]: any[] = await Promise.all([
    Section.find({ course: id }).populate("semester", "name status registrationOpen startDate").sort({ createdAt: -1 }).limit(6).lean(),
    CourseProgress.findOne({ student: me, course: id }).lean(),
    Enrollment.findOne({ student: me, course: id, status: { $ne: "dropped" } }).sort({ createdAt: -1 }).populate("semester", "name status").lean(),
    Course.find({ _id: { $ne: id }, $or: [{ category: course.category }, { department: course.department }] }).select(courseCard).limit(3).lean(),
  ]);
  const chat = await Conversation.findOne({ refKind: "course", refId: String(id), members: me }).select("_id").lean();
  res.json({ course, sections, progress: progress?.completed ?? [], enrollment, related, chatId: chat ? String((chat as any)._id) : null });
});

r.post("/courses/:id/progress", requireAuth, async (req, res) => {
  const { lectureId, done } = parse(z.object({ lectureId: z.string().min(1), done: z.boolean() }), req.body);
  const doc: any = await CourseProgress.findOneAndUpdate(
    { student: req.user!.id, course: oid(req.params.id) },
    done ? { $addToSet: { completed: lectureId } } : { $pull: { completed: lectureId } },
    { upsert: true, new: true, lean: true },
  );
  res.json({ completed: doc.completed });
});

/* ------------------------------------------------------------------ clubs */
r.get("/clubs", async (req, res) => {
  const q: any = {};
  const s = str(req.query.q);
  if (s) q.$or = [{ name: rx(s) }, { tagline: rx(s) }, { tags: rx(s) }];
  const cat = str(req.query.category);
  if (cat) q.category = cat;
  const [clubs, counts, cats]: any[] = await Promise.all([
    Club.find(q).sort({ name: 1 }).select("name category tagline image founded tags").lean(),
    ClubMember.aggregate([{ $group: { _id: "$club", n: { $sum: 1 } } }]),
    Club.distinct("category"),
  ]);
  const n = new Map(counts.map((c: any) => [String(c._id), c.n]));
  res.json({ items: clubs.map((c: any) => ({ ...c, members: n.get(String(c._id)) ?? 0 })), categories: cats.filter(Boolean).sort() });
});

r.get("/clubs/:id", requireAuth, async (req, res) => {
  const id = oid(req.params.id);
  const me = req.user!.id;
  const club: any = await Club.findById(id).lean();
  if (!club) throw notFound("That club was not found");
  const [rows, count, mine, events, chat]: any[] = await Promise.all([
    ClubMember.find({ club: id }).sort({ role: 1, createdAt: 1 }).limit(24).lean(),
    ClubMember.countDocuments({ club: id }),
    ClubMember.exists({ club: id, student: me }),
    Event.find({ club: id, endAt: { $gte: new Date() } }).sort({ startAt: 1 }).limit(4).select("title startAt venue image category").lean(),
    Conversation.findOne({ refKind: "club", refId: String(id), members: me }).select("_id").lean(),
  ]);
  const users: any[] = await User.find({ _id: { $in: rows.map((m: any) => m.student) } }).select("name image department").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json({
    club,
    memberCount: count,
    isMember: !!mine,
    members: rows.map((m: any) => ({
      id: m.student,
      role: m.role,
      name: byId.get(m.student)?.name ?? "Student",
      image: byId.get(m.student)?.image ?? null,
      department: byId.get(m.student)?.department ?? null,
    })),
    events,
    chatId: chat ? String(chat._id) : null,
  });
});

r.post("/clubs/:id/join", requireAuth, async (req, res) => {
  const id = oid(req.params.id);
  const me = req.user!.id;
  const club: any = await Club.findById(id).lean();
  if (!club) throw notFound("That club was not found");
  if (await ClubMember.exists({ club: id, student: me })) throw conflict("You are already a member of this club");
  await ClubMember.create({ club: id, student: me, role: "member" });
  await joinGroup("club", String(id), club.name, club.image, me);
  await notify(me, { type: "club", title: `Welcome to ${club.name}`, body: "Say hello in the club chat.", link: `/clubs/${id}` });
  res.status(201).json({ ok: true, memberCount: await ClubMember.countDocuments({ club: id }) });
});

r.delete("/clubs/:id/join", requireAuth, async (req, res) => {
  const id = oid(req.params.id);
  await ClubMember.deleteOne({ club: id, student: req.user!.id });
  await leaveGroup("club", String(id), req.user!.id);
  res.json({ ok: true, memberCount: await ClubMember.countDocuments({ club: id }) });
});

/* ------------------------------------------------------------------ events */
const eventStatus = (e: any, now = new Date()) => (new Date(e.endAt) < now ? "past" : new Date(e.startAt) <= now ? "ongoing" : "upcoming");

r.get("/events", async (req, res) => {
  const { page, limit, skip } = paging(req, 9);
  const now = new Date();
  const q: any = {};
  const status = str(req.query.status) || "upcoming";
  if (status === "upcoming") q.endAt = { $gte: now };
  else if (status === "past") q.endAt = { $lt: now };
  const cat = str(req.query.category);
  if (cat) q.category = cat;
  const s = str(req.query.q);
  if (s) q.$or = [{ title: rx(s) }, { venue: rx(s) }, { tags: rx(s) }];
  const [items, total, cats]: any[] = await Promise.all([
    Event.find(q)
      .sort({ startAt: status === "past" ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .populate("club", "name")
      .select("title category summary image venue startAt endAt capacity registered club")
      .lean(),
    Event.countDocuments(q),
    Event.distinct("category"),
  ]);
  res.json({
    items: items.map((e: any) => ({ ...e, status: eventStatus(e, now) })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    categories: cats.filter(Boolean).sort(),
  });
});

r.get("/events/:id", requireAuth, async (req, res) => {
  const id = oid(req.params.id);
  const event: any = await Event.findById(id).populate("club", "name image").lean();
  if (!event) throw notFound("That event was not found");
  const [reg, recent]: any[] = await Promise.all([
    EventRegistration.findOne({ event: id, student: req.user!.id }).lean(),
    EventRegistration.find({ event: id }).sort({ createdAt: -1 }).limit(6).lean(),
  ]);
  const users: any[] = await User.find({ _id: { $in: recent.map((x: any) => x.student) } }).select("name image").lean();
  res.json({
    event: { ...event, status: eventStatus(event) },
    isRegistered: !!reg,
    ticketNo: reg?.ticketNo ?? null,
    attendees: users.map((u) => ({ id: String(u._id), name: u.name, image: u.image ?? null })),
  });
});

r.post("/events/:id/register", requireAuth, async (req, res) => {
  const id = oid(req.params.id);
  const me = req.user!.id;
  const ev: any = await Event.findById(id).lean();
  if (!ev) throw notFound("That event was not found");
  if (new Date(ev.endAt) < new Date()) throw conflict("This event has already finished");
  if (await EventRegistration.exists({ event: id, student: me })) throw conflict("You are already registered for this event");
  const seat = await Event.findOneAndUpdate({ _id: id, $expr: { $lt: ["$registered", "$capacity"] } }, { $inc: { registered: 1 } }, { new: true });
  if (!seat) throw conflict("This event is full");
  const ticketNo = `EVT-${randomBytes(3).toString("hex").toUpperCase()}`;
  try {
    await EventRegistration.create({ event: id, student: me, ticketNo });
  } catch (e) {
    await Event.updateOne({ _id: id }, { $inc: { registered: -1 } });
    throw e;
  }
  await notify(me, { type: "event", title: `You're registered for ${ev.title}`, body: `Ticket ${ticketNo}`, link: `/events/${id}` });
  res.status(201).json({ ok: true, ticketNo, registered: seat.registered });
});

r.delete("/events/:id/register", requireAuth, async (req, res) => {
  const id = oid(req.params.id);
  const del = await EventRegistration.deleteOne({ event: id, student: req.user!.id });
  if (del.deletedCount) await Event.updateOne({ _id: id, registered: { $gt: 0 } }, { $inc: { registered: -1 } });
  const ev: any = await Event.findById(id).select("registered").lean();
  res.json({ ok: true, registered: ev?.registered ?? 0 });
});

/* ------------------------------------------------------------------ notices */
r.get("/notices", async (req, res) => {
  const { page, limit, skip } = paging(req, 10);
  const q: any = {};
  const cat = str(req.query.category);
  if (cat) q.category = cat;
  const s = str(req.query.q);
  if (s) q.$or = [{ title: rx(s) }, { body: rx(s) }];
  const [items, total, cats]: any[] = await Promise.all([
    Notice.find(q).sort({ pinned: -1, publishedAt: -1 }).skip(skip).limit(limit).lean(),
    Notice.countDocuments(q),
    Notice.distinct("category"),
  ]);
  res.json({
    items: items.map((n: any) => ({ ...n, body: undefined, excerpt: String(n.body ?? "").replace(/\s+/g, " ").slice(0, 170) })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    categories: cats.filter(Boolean).sort(),
  });
});

r.get("/notices/:id", async (req, res) => {
  const n = await Notice.findById(oid(req.params.id)).lean();
  if (!n) throw notFound("That notice was not found");
  res.json(n);
});

export default r;
