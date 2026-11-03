import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { EVAL_QUESTIONS, GRADE_SCALE, buildHistory } from "../lib/academics";
import { joinGroup, leaveGroup } from "../lib/chat";
import { evaluationList } from "../lib/evaluations";
import { docNo, installmentsFor, taka, tuitionBreakdown } from "../lib/fees";
import { bad, conflict, forbidden, oid, parse } from "../lib/http";
import { notify } from "../lib/notify";
import { Enrollment, Evaluation, Invoice, Payment, Section, Semester, User } from "../models";

const r = Router();

r.get("/semesters", async (_req, res) => {
  res.json({ items: await Semester.find().sort({ startDate: -1 }).lean() });
});

const toMin = (t: string) => {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
};
const overlaps = (a: any, b: any) => a.day === b.day && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

const openSemester = () => Semester.findOne({ registrationOpen: true }).sort({ startDate: -1 }).lean() as Promise<any>;
const tuitionInvoice = (student: string, semester: any) =>
  Invoice.findOne({ student, semester, type: "tuition", refKind: "registration", status: { $ne: "cancelled" } }) as any;

/** Frees seats, group chats and the unpaid invoice of a student's registration. */
async function releaseRegistration(me: string, semesterId: any) {
  const rows: any[] = (await Enrollment.find({ student: me, semester: semesterId, status: "enrolled" }).lean()) as any;
  for (const e of rows) {
    if (e.section) await Section.updateOne({ _id: e.section, enrolled: { $gt: 0 } }, { $inc: { enrolled: -1 } });
    await leaveGroup("course", String(e.course), me);
  }
  await Enrollment.deleteMany({ student: me, semester: semesterId, status: "enrolled" });
  const inv: any = await Invoice.findOneAndDelete({ student: me, semester: semesterId, type: "tuition", refKind: "registration" });
  if (inv) await Payment.deleteMany({ invoice: inv._id, status: { $ne: "success" } });
}

r.get("/registration/context", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const semester = await openSemester();
  if (!semester) return void res.json({ semester: null });
  const [sections, taken, mine, invoice, user]: any[] = await Promise.all([
    Section.find({ semester: semester._id }).populate("course", "code title credits department category image prerequisites").lean(),
    Enrollment.find({ student: me, status: "completed" }).populate("course", "code").lean(),
    Enrollment.find({ student: me, semester: semester._id, status: "enrolled" }).lean(),
    tuitionInvoice(me, semester._id).lean(),
    User.findById(me).select("waiverPercent").lean(),
  ]);
  const passed = new Set(taken.filter((t: any) => t.gradePoint > 0 && t.course).map((t: any) => t.course.code));
  const items = sections
    .filter((s: any) => s.course)
    .map((s: any) => ({
      id: String(s._id),
      course: s.course,
      name: s.name,
      instructor: s.instructor,
      schedule: s.schedule,
      capacity: s.capacity,
      enrolled: s.enrolled,
      seatsLeft: Math.max(0, s.capacity - s.enrolled),
      missingPrereqs: (s.course.prerequisites ?? []).filter((c: string) => !passed.has(c)),
      alreadyPassed: passed.has(s.course.code),
    }))
    .sort((a: any, b: any) => a.course.code.localeCompare(b.course.code));
  res.json({
    semester,
    sections: items,
    registered: {
      sectionIds: mine.map((m: any) => String(m.section)),
      invoiceId: invoice ? String(invoice._id) : null,
      paid: invoice?.paid ?? 0,
      locked: (invoice?.paid ?? 0) > 0,
    },
    waiverPercent: user?.waiverPercent ?? 0,
  });
});

r.post("/registration", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const { sectionIds } = parse(z.object({ sectionIds: z.array(z.string()).min(1, "Pick at least one course").max(10) }), req.body);
  const semester = await openSemester();
  if (!semester) throw conflict("Registration is not open right now");
  if (semester.registrationDeadline && new Date(semester.registrationDeadline) < new Date()) throw conflict("The registration deadline has passed");

  const ids = [...new Set(sectionIds)].map(oid);
  const sections: any[] = (await Section.find({ _id: { $in: ids }, semester: semester._id }).populate("course").lean()) as any;
  if (sections.length !== ids.length) throw bad("One of the selected sections is not offered this semester");
  const codes = sections.map((s) => s.course.code);
  if (new Set(codes).size !== codes.length) throw bad("You picked the same course twice");

  const credits = sections.reduce((s, x) => s + x.course.credits, 0);
  if (credits < semester.minCredits) throw bad(`Register for at least ${semester.minCredits} credits. You picked ${credits}.`);
  if (credits > semester.maxCredits) throw bad(`You can take at most ${semester.maxCredits} credits. You picked ${credits}.`);

  for (let i = 0; i < sections.length; i++)
    for (let j = i + 1; j < sections.length; j++)
      for (const a of sections[i].schedule ?? [])
        for (const b of sections[j].schedule ?? [])
          if (overlaps(a, b)) throw bad(`${sections[i].course.code} and ${sections[j].course.code} both meet on ${a.day} between ${a.start} and ${a.end}`);

  const taken: any[] = (await Enrollment.find({ student: me, status: "completed" }).populate("course", "code").lean()) as any;
  const passed = new Set(taken.filter((t) => t.gradePoint > 0 && t.course).map((t) => t.course.code));
  for (const s of sections) {
    if (passed.has(s.course.code)) throw bad(`You have already passed ${s.course.code}`);
    const missing = (s.course.prerequisites ?? []).filter((c: string) => !passed.has(c));
    if (missing.length) throw bad(`${s.course.code} needs ${missing.join(" and ")} first`);
  }

  const existing = await tuitionInvoice(me, semester._id).lean();
  if (existing?.paid > 0) throw conflict("Your fees already have payments, so this registration is locked. Ask the registrar's office for changes.");
  await releaseRegistration(me, semester._id);

  const grabbed: any[] = [];
  try {
    for (const s of sections) {
      const ok = await Section.findOneAndUpdate({ _id: s._id, $expr: { $lt: ["$enrolled", "$capacity"] } }, { $inc: { enrolled: 1 } });
      if (!ok) throw conflict(`${s.course.code} section ${s.name} just filled up. Pick another section.`);
      grabbed.push(s._id);
    }
    await Enrollment.insertMany(sections.map((s) => ({ student: me, semester: semester._id, course: s.course._id, section: s._id, status: "enrolled" })));
  } catch (e) {
    await Section.updateMany({ _id: { $in: grabbed } }, { $inc: { enrolled: -1 } });
    await Enrollment.deleteMany({ student: me, semester: semester._id, status: "enrolled" });
    throw e;
  }

  const user: any = await User.findById(me).select("waiverPercent").lean();
  const bill = tuitionBreakdown(semester.fees, credits, user?.waiverPercent ?? 0);
  const installments = installmentsFor(bill.total);
  const invoice = await Invoice.create({
    number: docNo("INV"),
    student: me,
    semester: semester._id,
    type: "tuition",
    title: `Tuition and fees, ${semester.name}`,
    ...bill,
    dueDate: installments[0].dueDate,
    installments,
    refKind: "registration",
    refId: String(semester._id),
  });
  for (const s of sections) await joinGroup("course", String(s.course._id), `${s.course.code} ${s.course.title}`, s.course.image, me);
  await notify(me, {
    type: "registration",
    title: `You're registered for ${semester.name}`,
    body: `${sections.length} courses, ${credits} credits. Total fees ${taka(bill.total)}, first installment ${taka(installments[0].amount)}.`,
    link: "/fees",
  });
  res.status(201).json({ courses: sections.length, credits, invoiceId: String(invoice._id), total: bill.total });
});

r.delete("/registration", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const semester = await openSemester();
  if (!semester) throw conflict("Registration is not open right now");
  const inv = await tuitionInvoice(me, semester._id).lean();
  if (inv?.paid > 0) throw conflict("Your fees already have payments, so this registration is locked.");
  await releaseRegistration(me, semester._id);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ semester wise record */
r.get("/academics/history", requireAuth, async (req, res) => {
  res.json({ ...(await buildHistory(req.user!.id)), scale: GRADE_SCALE });
});

/* ------------------------------------------------------------------ course evaluation */
r.get("/evaluations", requireAuth, async (req, res) => {
  res.json({ questions: EVAL_QUESTIONS, items: await evaluationList(req.user!.id) });
});

r.post("/evaluations", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const body = parse(
    z.object({
      sectionId: z.string().min(1),
      ratings: z.record(z.number().int().min(1).max(5)),
      comment: z.string().trim().max(1000, "Keep comments under 1,000 characters").optional(),
    }),
    req.body,
  );
  for (const q of EVAL_QUESTIONS) if (!body.ratings[q.key]) throw bad("Rate every statement before sending");
  const list = await evaluationList(me);
  const item = list.find((i) => String(i.section._id) === body.sectionId);
  if (!item) throw forbidden("You can only evaluate courses you took while evaluations are open");
  if (item.done) throw conflict("You have already evaluated this course");
  const ratings = Object.fromEntries(EVAL_QUESTIONS.map((q) => [q.key, body.ratings[q.key]]));
  await Evaluation.create({ student: me, semester: item.semester._id, course: item.course._id, section: item.section._id, ratings, comment: body.comment });
  res.status(201).json({ ok: true, remaining: list.filter((i) => !i.done && String(i.section._id) !== body.sectionId).length });
});

export default r;
