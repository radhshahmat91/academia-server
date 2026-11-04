import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { config } from "../config";
import { EVAL_QUESTIONS, gradeFor } from "../lib/academics";
import { applyPayment, docNo, installmentsFor, tuitionBreakdown } from "../lib/fees";
import * as M from "../models";
import { CHAT, CLUBS, COURSES, EVENTS, FACULTY, NEXT_SECTIONS, NOTICES, RES, ROUTES, STUDENTS, TRACKS, type CourseDef } from "./catalog";
import { photo, video } from "./media";

if (config.isProd && !process.argv.includes("--force")) {
  console.error("Refusing to reseed a production database. Pass --force if you really mean it.");
  process.exit(1);
}

/* ------------------------------------------------------------------ helpers */
let state = 20261103;
const rnd = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const DAY = 86_400_000;
// Mongoose honours this at runtime but omits it from the InsertManyOptions typings.
const NO_TS = { timestamps: false } as any;
const now = new Date();
const ago = (days: number, hour = 10) => {
  const d = new Date(+now - days * DAY);
  d.setUTCHours(hour - 6, between(0, 59), 0, 0);
  return d;
};

const order = ["Spring", "Summer", "Fall"] as const;
type Season = (typeof order)[number];
const startMonth: Record<Season, number> = { Spring: 0, Summer: 4, Fall: 8 };
const mk = (year: number, season: Season) => ({
  year,
  season,
  name: `${season} ${year}`,
  start: new Date(Date.UTC(year, startMonth[season], 8)),
  end: new Date(Date.UTC(year, startMonth[season] + 3, 26)),
});
const step = (s: { year: number; season: Season }, d: 1 | -1) => {
  const i = order.indexOf(s.season) + d;
  if (i < 0) return mk(s.year - 1, "Fall");
  if (i > 2) return mk(s.year + 1, "Spring");
  return mk(s.year, order[i]);
};

async function main() {
  await mongoose.connect(config.mongoUri, { dbName: config.dbName });
  const db = mongoose.connection.getClient().db(config.dbName);

  // Start from a clean slate. BetterAuth's signing keys (jwks) are kept so open sessions stay valid.
  for (const c of await db.listCollections().toArray()) {
    if (c.name !== "jwks" && !c.name.startsWith("system.")) await db.collection(c.name).drop().catch(() => {});
  }
  await Promise.all(Object.values(mongoose.models).filter((m) => m.modelName !== "User").map((m) => m.syncIndexes()));

  /* ---------------------------------------------------------------- semesters */
  const cur = mk(now.getUTCFullYear(), order[Math.min(2, Math.floor(now.getUTCMonth() / 4))]);
  const past: ReturnType<typeof mk>[] = [];
  for (let s = cur, i = 0; i < 5; i++) {
    s = step(s, -1);
    past.unshift(s);
  }
  const nxt = step(cur, 1);
  const makeSem = (s: ReturnType<typeof mk>, status: string, extra: object = {}) =>
    M.Semester.create({ name: s.name, season: s.season, year: s.year, startDate: s.start, endDate: s.end, status, ...extra });
  const pastDocs: any[] = [];
  for (const [i, s] of past.entries()) pastDocs.push(await makeSem(s, "completed", { evaluationOpen: i === past.length - 1 }));
  const curDoc: any = await makeSem(cur, "ongoing");
  const nextDoc: any = await makeSem(nxt, "registration", { registrationOpen: true, registrationDeadline: new Date(+now + 14 * DAY) });

  /* ---------------------------------------------------------------- courses */
  const byCode = new Map<string, any>();
  const progSlots = ["course-programming-1", "course-programming-2", "course-programming-3"];
  let progIdx = 0;
  const notesFor = (c: CourseDef) => [
    { title: "Course roadmap", kind: "note", body: c.topics.map((t, i) => `Unit ${i + 1}. ${t}`).join("\n"), description: "What each unit covers, in order." },
    { title: "Revision checklist", kind: "note", body: c.topics.map((t) => `I can explain ${t.toLowerCase()}`).join("\n"), description: "Tick these off before every quiz." },
    ...[...(RES[c.cat] ?? []), ...(c.extra ?? []).flatMap((k) => RES[k] ?? [])]
      .filter((r, i, all) => all.findIndex((x) => x.url === r.url) === i)
      .map((r) => ({ title: r.title, kind: "link", url: r.url, description: r.note })),
  ];
  for (const def of COURSES) {
    const slot = def.cat === "programming" ? progSlots[progIdx++ % 3] : `course-${def.cat}`;
    const lectures = def.vids
      .flatMap((t) => video(t, def.vids.length > 1 ? 2 : 3))
      .slice(0, 4)
      .map((v) => ({ title: v.title, youtubeId: v.id, minutes: v.minutes ?? undefined }));
    const t = def.topics;
    const doc = await M.Course.create({
      code: def.code,
      title: def.title,
      department: def.dept,
      level: Number(def.code.split(" ")[1][0]) * 100,
      credits: def.credits,
      category: def.cat,
      image: photo(slot),
      summary: def.summary,
      description: `${def.summary} Over the semester you will work through ${t.length} units, starting with ${t.slice(0, 3).join(", ").toLowerCase()}. Classes mix lectures with problem sessions, and every unit has video lectures and notes on this page.`,
      prerequisites: def.pre,
      topics: t,
      outcomes: [
        `Explain the core ideas of ${t[0].toLowerCase()} in your own words`,
        `Apply ${t[Math.min(2, t.length - 1)].toLowerCase()} to problems you have not seen before`,
        "Combine the units in a final project or exam",
      ],
      assessment: [
        { label: "Quizzes", weight: 15 },
        { label: "Midterm exam", weight: 25 },
        { label: "Assignments and project", weight: 20 },
        { label: "Final exam", weight: 35 },
        { label: "Attendance and participation", weight: 5 },
      ],
      lectures,
      notes: notesFor(def),
      tags: def.tags,
      featured: !!def.featured,
    });
    byCode.set(def.code, doc);
  }

  /* ---------------------------------------------------------------- sections */
  const DAYS = [["Sat", "Mon"], ["Sun", "Tue"], ["Mon", "Wed"], ["Tue", "Thu"], ["Sat", "Tue"], ["Sun", "Wed"]];
  const TIMES = [["08:30", "10:00"], ["10:00", "11:30"], ["11:30", "13:00"], ["14:00", "15:30"], ["15:30", "17:00"]];
  const fixedCurrent: Record<string, [string[], string[]]> = {
    "CSE 3201": [["Sun", "Tue"], ["10:00", "11:30"]],
    "CSE 3211": [["Mon", "Wed"], ["10:00", "11:30"]],
    "CSE 3221": [["Sat", "Mon"], ["11:30", "13:00"]],
    "BUS 3101": [["Tue", "Thu"], ["14:00", "15:30"]],
  };
  const secCache = new Map<string, any>();
  const instructor = () => {
    const [name, title] = pick(FACULTY);
    return { name, title, email: `${name.toLowerCase().replace(/^dr\.\s*/, "").replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@academiaconnect.test` };
  };
  const room = () => `Room ${pick([2, 3, 4, 5])}${String(between(1, 20)).padStart(2, "0")}`;
  async function ensureSection(sem: any, course: any) {
    const key = `${sem._id}:${course._id}`;
    if (secCache.has(key)) return secCache.get(key);
    const fixed = String(sem._id) === String(curDoc._id) ? fixedCurrent[course.code] : undefined;
    const days = fixed?.[0] ?? pick(DAYS);
    const time = fixed?.[1] ?? pick(TIMES);
    const sec = await M.Section.create({
      semester: sem._id,
      course: course._id,
      name: "A",
      instructor: instructor(),
      schedule: days.map((d) => ({ day: d, start: time[0], end: time[1], room: room() })),
      capacity: 40,
      enrolled: 0,
    });
    secCache.set(key, sec);
    return sec;
  }
  for (const [code, name, days, time, capacity, enrolled] of NEXT_SECTIONS) {
    const [start, end] = time.split("-");
    await M.Section.create({
      semester: nextDoc._id,
      course: byCode.get(code)._id,
      name,
      instructor: instructor(),
      schedule: days.split(",").map((d) => ({ day: d, start, end, room: room() })),
      capacity,
      enrolled,
    });
  }

  /* ---------------------------------------------------------------- users via BetterAuth */
  const auth = betterAuth({
    database: mongodbAdapter(db as any),
    secret: "seed-only-secret-that-the-app-never-uses-0123456789",
    baseURL: "http://localhost:3000",
    emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 6 },
  });
  async function createUser(name: string, email: string, password: string, extra: Record<string, unknown>) {
    const res: any = await auth.api.signUpEmail({ body: { name, email, password } });
    const id = String(res.user.id);
    await M.User.updateOne({ _id: id }, { $set: { emailVerified: true, ...extra } });
    return id;
  }
  const deptName: Record<string, string> = {
    CSE: "Computer Science & Engineering",
    EEE: "Electrical & Electronic Engineering",
    BBA: "Business Administration",
  };
  const adminId = await createUser("Registrar Office", "admin@academiaconnect.test", "Admin@123", { role: "admin" });
  const people: { id: string; name: string; track: "CSE" | "EEE" | "BBA"; cohort: number; demo: boolean }[] = [];
  const demoId = await createUser("Tanvir Ahmed", "student@academiaconnect.test", "Student@123", {
    role: "student",
    studentId: "251001",
    department: deptName.CSE,
    batch: past[0].name,
    phone: "01712345678",
    waiverPercent: 25,
    bio: "Fifth semester CSE student. I like algorithms, camera lenses and late night hackathons.",
    interests: ["Algorithms", "Web development", "Photography"],
    social: { github: "https://github.com", linkedin: "https://www.linkedin.com", x: "https://x.com" },
  });
  people.push({ id: demoId, name: "Tanvir Ahmed", track: "CSE", cohort: 0, demo: true });
  const bios = ["Always up for a study group.", "Building small projects after class.", "Football on Fridays, code the rest of the week.", "Learning something new every semester.", "Club events are my favourite part of campus."];
  for (const [i, [name, track, cohort]] of STUDENTS.entries()) {
    const [first, ...rest] = name.toLowerCase().split(" ");
    const batchSem = track === "CSE" ? past[cohort] : past[3];
    const id = await createUser(name, `${first}.${rest.join("")}@academiaconnect.test`, "Student@123", {
      role: "student",
      studentId: `${String(batchSem.year).slice(2)}${batchSem.season === "Spring" ? 1 : batchSem.season === "Summer" ? 2 : 3}${String(i + 2).padStart(3, "0")}`,
      department: deptName[track],
      batch: batchSem.name,
      waiverPercent: pick([0, 0, 0, 25, 50]),
      bio: pick(bios),
      interests: [pick(["Robotics", "Debate", "Music", "Cricket", "Startups", "Photography", "Chess", "Poetry"]), pick(["Open source", "Design", "Football", "Travel", "Cooking"])],
    });
    people.push({ id, name, track, cohort, demo: false });
  }
  const nameOf = new Map(people.map((p) => [p.id, p.name]));

  /* ---------------------------------------------------------------- enrollments */
  const enrollRows: any[] = [];
  const currentBy = new Map<string, string[]>(); // course code -> student ids (current semester)
  const credits = (code: string) => byCode.get(code).credits as number;
  const semCredits = new Map<string, { student: string; sem: any; credits: number }>();
  for (const p of people) {
    const t = TRACKS[p.track];
    const k = p.track === "CSE" ? 5 - p.cohort : t.done.length;
    const sems = pastDocs.slice(5 - k);
    for (let i = 0; i < k; i++) {
      for (const code of t.done[i]) {
        const course = byCode.get(code);
        const section = await ensureSection(sems[i], course);
        let marks = p.demo ? between(62, 95) : between(52, 96);
        if (!p.demo && rnd() < 0.07) marks = between(41, 49);
        const g = gradeFor(marks);
        enrollRows.push({ student: p.id, semester: sems[i]._id, course: course._id, section: section._id, status: "completed", marks, grade: g.grade, gradePoint: g.point });
        const key = `${p.id}:${sems[i]._id}`;
        semCredits.set(key, { student: p.id, sem: sems[i], credits: (semCredits.get(key)?.credits ?? 0) + course.credits });
      }
    }
    const currentCodes = p.track === "CSE" ? (p.cohort === 0 ? t.current : t.done[k]) : t.current;
    for (const code of currentCodes) {
      const course = byCode.get(code);
      const section = await ensureSection(curDoc, course);
      enrollRows.push({ student: p.id, semester: curDoc._id, course: course._id, section: section._id, status: "enrolled" });
      currentBy.set(code, [...(currentBy.get(code) ?? []), p.id]);
      const key = `${p.id}:${curDoc._id}`;
      semCredits.set(key, { student: p.id, sem: curDoc, credits: (semCredits.get(key)?.credits ?? 0) + credits(code) });
    }
  }
  await M.Enrollment.insertMany(enrollRows);
  const counts: any[] = await M.Enrollment.aggregate([{ $group: { _id: "$section", n: { $sum: 1 } } }]);
  await M.Section.bulkWrite(counts.map((c) => ({ updateOne: { filter: { _id: c._id }, update: { $set: { enrolled: c.n } } } })));

  /* ---------------------------------------------------------------- invoices and payments */
  const waiverOf = new Map<string, number>(((await M.User.find().select("waiverPercent").lean()) as any[]).map((u) => [String(u._id), u.waiverPercent ?? 0]));
  async function makeInvoice(studentId: string, sem: any, cr: number, from: Date, paidCount: number) {
    const bill = tuitionBreakdown(sem.fees, cr, waiverOf.get(studentId) ?? 0);
    const installments = installmentsFor(bill.total, from);
    const inv: any = new M.Invoice({
      number: docNo("INV"),
      student: studentId,
      semester: sem._id,
      type: "tuition",
      title: `Tuition and fees, ${sem.name}`,
      ...bill,
      dueDate: installments[0].dueDate,
      installments,
      refKind: "registration",
      refId: String(sem._id),
    });
    const pays: any[] = [];
    for (let i = 0; i < paidCount; i++) {
      const amount = installments[i].amount;
      const paidAt = new Date(+installments[i].dueDate - between(0, 4) * DAY);
      pays.push({ invoice: inv._id, student: studentId, amount, method: pick(["wallet", "wallet", "card", "bank"]), status: "success", txnId: docNo("TXN"), receiptNo: docNo("RCT"), installmentNo: i + 1, payerRef: "Demo gateway", paidAt, createdAt: paidAt, updatedAt: paidAt });
      applyPayment(inv, amount);
    }
    await inv.save();
    if (pays.length) await M.Payment.insertMany(pays, NO_TS);
    return inv;
  }
  const pastForInvoices = new Set(pastDocs.slice(2).map((s) => String(s._id)));
  const rich = new Set(people.filter((p) => p.demo || (p.track === "CSE" && p.cohort === 0)).map((p) => p.id));
  for (const { student, sem, credits: cr } of [...semCredits.values()].sort((a, b) => +a.sem.startDate - +b.sem.startDate)) {
    if (String(sem._id) === String(curDoc._id)) {
      const demo = student === demoId;
      await makeInvoice(student, sem, cr, new Date(+now - (demo ? 26 : between(4, 40)) * DAY), demo ? 1 : pick([0, 1, 1, 2, 3]));
    } else if (pastForInvoices.has(String(sem._id)) && rich.has(student)) {
      await makeInvoice(student, sem, cr, new Date(+sem.startDate - 10 * DAY), 3);
    }
  }

  /* ---------------------------------------------------------------- transport */
  const routeDocs: any[] = [];
  for (const r of ROUTES) {
    routeDocs.push(await M.TransportRoute.create({ name: r.name, code: r.code, busNo: r.bus, image: photo(r.slot), fee: r.fee, capacity: r.cap, enrolled: r.used, stops: r.stops.map(([name, time]) => ({ name, time })) }));
  }
  const passFor = async (studentId: string, route: any, stop: string, paid: boolean) => {
    const invoice: any = await M.Invoice.create({
      number: docNo("INV"), student: studentId, semester: curDoc._id, type: "transport", title: `Bus pass, ${route.name}, ${curDoc.name}`,
      items: [{ label: `Semester bus pass, ${route.name}`, amount: route.fee }], subtotal: route.fee, total: route.fee, paid: paid ? route.fee : 0,
      status: paid ? "paid" : "unpaid", dueDate: new Date(+now + (paid ? -20 : 4) * DAY), refKind: "transport",
    });
    if (paid) {
      const paidAt = new Date(+now - 24 * DAY);
      await M.Payment.create({ invoice: invoice._id, student: studentId, amount: route.fee, method: "wallet", status: "success", txnId: docNo("TXN"), receiptNo: docNo("RCT"), payerRef: "Demo gateway", paidAt });
    }
    await M.TransportPass.create({
      student: studentId, semester: curDoc._id, route: route._id, stop, status: paid ? "active" : "pending", passNo: docNo("BUS"), invoice: invoice._id,
      ...(paid ? { validFrom: curDoc.startDate, validTo: curDoc.endDate } : {}),
    });
  };
  await passFor(demoId, routeDocs[0], "Uttara Sector 3", true);
  for (const p of people.filter((x) => !x.demo).slice(0, 7)) {
    const route = pick(routeDocs.filter((r) => r.enrolled < r.capacity));
    await passFor(p.id, route, pick<{ name: string }>(route.stops).name, rnd() < 0.75);
  }

  /* ---------------------------------------------------------------- clubs and events */
  const clubDocs = new Map<string, any>();
  for (const c of CLUBS) {
    clubDocs.set(c.name, await M.Club.create({ ...c, image: photo(c.slot), email: `${c.name.split(" ")[0].toLowerCase()}@academiaconnect.test`, social: { facebook: "https://facebook.com", instagram: "https://instagram.com", x: "https://x.com" } }));
  }
  const memberRows: any[] = [];
  const members = new Map<string, Set<string>>();
  const addMember = (club: any, student: string, role = "member") => {
    const set = members.get(String(club._id)) ?? new Set();
    if (set.has(student)) return;
    set.add(student);
    members.set(String(club._id), set);
    memberRows.push({ club: club._id, student, role });
  };
  for (const c of CLUBS) {
    const pres = people.find((p) => p.name === c.president);
    if (pres) addMember(clubDocs.get(c.name), pres.id, "executive");
  }
  for (const n of ["Programming and Hackers Society", "Photography Club", "Entrepreneurship and Startup Cell"]) addMember(clubDocs.get(n), demoId);
  for (const p of people.filter((x) => !x.demo)) for (let i = between(1, 3); i > 0; i--) addMember(pick([...clubDocs.values()]), p.id);
  await M.ClubMember.insertMany(memberRows);

  const eventDocs: any[] = [];
  for (const e of EVENTS) {
    const startAt = e.start(now);
    eventDocs.push(
      await M.Event.create({
        title: e.title, category: e.category, summary: e.summary, venue: e.venue, startAt, endAt: new Date(+startAt + e.hours * 3_600_000),
        capacity: e.capacity, registered: e.reg, image: photo(e.slot), club: e.club ? clubDocs.get(e.club)?._id : undefined, tags: e.tags,
        description: `${e.summary} Everyone on campus is welcome. Register on AcademiaConnect to get your ticket number and a reminder.`,
        agenda: e.agenda.map(([time, title]) => ({ time, title })), speakers: e.speakers.filter(([n]) => n).map(([name, title]) => ({ name, title })),
      }),
    );
  }
  const regRows: any[] = [];
  for (const ev of eventDocs) {
    const upcoming = ev.startAt > now;
    const who = new Set<string>();
    if (upcoming && (ev.title.startsWith("Guest Lecture") || ev.title.startsWith("Career Fair"))) who.add(demoId);
    for (const p of people.filter((x) => !x.demo)) if (rnd() < 0.35) who.add(p.id);
    for (const s of who) regRows.push({ event: ev._id, student: s, ticketNo: `EVT-${docNo("T").slice(-8)}` });
  }
  await M.EventRegistration.insertMany(regRows);

  /* ---------------------------------------------------------------- notices, evaluations */
  await M.Notice.insertMany(NOTICES.map((n) => ({ title: n.title, body: n.body, category: n.category, priority: n.priority, pinned: n.pinned, author: n.author, publishedAt: ago(n.ago, 11) })));

  const prevSem = pastDocs[4];
  const prevRows: any[] = await M.Enrollment.find({ semester: prevSem._id }).lean();
  const comments = ["Clear lectures and helpful examples.", "More practice problems before exams would help.", "The video lectures were a great supplement.", "Pace was good. Office hours were useful.", ""];
  const evalRows: any[] = [];
  const demoPrev = prevRows.filter((r) => r.student === demoId);
  for (const r of prevRows) {
    const isDemo = r.student === demoId;
    if (isDemo ? demoPrev.indexOf(r) >= 2 : rnd() > 0.6) continue; // demo leaves the last two pending
    evalRows.push({ student: r.student, semester: r.semester, course: r.course, section: r.section, ratings: Object.fromEntries(EVAL_QUESTIONS.map((q) => [q.key, rnd() < 0.7 ? between(4, 5) : between(2, 4)])), comment: pick(comments) });
  }
  await M.Evaluation.insertMany(evalRows);

  /* ---------------------------------------------------------------- chat and notifications */
  const minsAgo = (m: number) => new Date(+now - m * 60_000);
  async function chat(conv: any, lines: { sender: string; text: string; mins: number }[], unread: Record<string, number> = {}) {
    const sorted = [...lines].sort((a, b) => b.mins - a.mins);
    await M.Message.insertMany(sorted.map((l) => ({ conversation: conv._id, sender: l.sender, text: l.text, readBy: conv.members.filter((m: string) => !(unread[m] > 0) || m === l.sender), createdAt: minsAgo(l.mins), updatedAt: minsAgo(l.mins) })), NO_TS);
    const last = sorted[sorted.length - 1];
    await M.Conversation.updateOne({ _id: conv._id }, { $set: { last: { text: last.text.slice(0, 140), sender: last.sender, at: minsAgo(last.mins) }, unread } });
  }
  for (const [clubId, set] of members) {
    const club: any = [...clubDocs.values()].find((c) => String(c._id) === clubId);
    const ids = [...set];
    const conv: any = await M.Conversation.create({ kind: "group", name: club.name, image: club.image, refKind: "club", refId: clubId, members: ids });
    if (ids.length > 1) await chat(conv, CHAT.club.map((text, i) => ({ sender: ids[i % ids.length], text, mins: 600 - i * 95 })), ids.includes(demoId) ? { [demoId]: club.name.startsWith("Programming") ? 2 : 0 } : {});
  }
  for (const [code, ids] of currentBy) {
    const course = byCode.get(code);
    const conv: any = await M.Conversation.create({ kind: "group", name: `${code} ${course.title}`, image: course.image, refKind: "course", refId: String(course._id), members: ids });
    if (ids.length > 1) await chat(conv, CHAT.course.map((text, i) => ({ sender: ids[i % ids.length], text, mins: 2000 - i * 140 })));
  }
  const buddies = people.filter((p) => !p.demo && p.track === "CSE").slice(0, 5);
  for (const [i, b] of buddies.entries()) {
    const [a1, a2] = CHAT.direct[i];
    const key = [demoId, b.id].sort().join(":");
    const conv: any = await M.Conversation.create({ kind: "direct", members: [demoId, b.id], directKey: key });
    const unread = i < 2;
    await chat(conv, unread ? [{ sender: demoId, text: a2 && i === 1 ? "Sure, which unit do you need?" : "Sounds good.", mins: 300 + i * 40 }, { sender: b.id, text: a1, mins: 25 + i * 70 }] : [{ sender: b.id, text: a1, mins: 900 + i * 120 }, { sender: demoId, text: a2, mins: 880 + i * 120 }], unread ? { [demoId]: 1 } : {});
  }
  await M.Notification.insertMany(
    [
      ["registration", "Registration for " + nxt.name + " is open", "Pick your sections before the deadline.", "/registration", false, 120],
      ["notice", "Second tuition installment due soon", "Pay from the Fees page.", "/fees", false, 300],
      ["event", "You're registered for Guest Lecture: Careers in Machine Learning", "See you in the auditorium.", "/events", true, 1500],
      ["club", "Welcome to Programming and Hackers Society", "Say hello in the club chat.", "/clubs", true, 4000],
      ["payment", "Payment received", "First installment of tuition was received.", "/fees", true, 36000],
    ].map(([type, title, body, link, read, m]: any) => ({ user: demoId, type, title, body, link, read, createdAt: minsAgo(m), updatedAt: minsAgo(m) })),
    NO_TS,
  );

  /* ---------------------------------------------------------------- summary */
  const [users, courses, sections, enrolls, invoices, payments] = await Promise.all([M.User.countDocuments(), M.Course.countDocuments(), M.Section.countDocuments(), M.Enrollment.countDocuments(), M.Invoice.countDocuments(), M.Payment.countDocuments()]);
  console.log(`Seeded ${users} users (${nameOf.size} students), ${courses} courses, ${sections} sections, ${enrolls} enrollments, ${invoices} invoices, ${payments} payments.`);
  console.log(`Semesters: ${pastDocs.map((s) => s.name).join(", ")} | now ${curDoc.name} | registration open for ${nextDoc.name}`);
  console.log("Demo student: student@academiaconnect.test / Student@123");
  console.log("Admin:        admin@academiaconnect.test / Admin@123");
  void adminId;
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
