import { Schema, model } from "mongoose";

const ref = (name: string, extra: object = {}) => ({ type: Schema.Types.ObjectId, ref: name, ...extra });
const opts = { timestamps: true } as const;
const str = { type: String, trim: true };

/** Read/write view of the BetterAuth `user` collection (BetterAuth owns auth fields). */
export const User = model(
  "User",
  new Schema(
    {
      name: String,
      email: String,
      image: String,
      role: { type: String, default: "student" },
      studentId: String,
      department: String,
      batch: String,
      phone: String,
      bio: String,
      interests: [String],
      waiverPercent: { type: Number, default: 0 },
      social: { facebook: String, linkedin: String, github: String, x: String },
    },
    { collection: "user", strict: false, timestamps: false },
  ),
);

export const Semester = model(
  "Semester",
  new Schema(
    {
      name: { type: String, required: true, unique: true },
      season: String,
      year: Number,
      startDate: Date,
      endDate: Date,
      status: { type: String, enum: ["completed", "ongoing", "registration", "upcoming"], default: "upcoming" },
      registrationOpen: { type: Boolean, default: false },
      registrationDeadline: Date,
      evaluationOpen: { type: Boolean, default: false },
      minCredits: { type: Number, default: 9 },
      maxCredits: { type: Number, default: 15 },
      fees: {
        perCredit: { type: Number, default: 4500 },
        registration: { type: Number, default: 6000 },
        library: { type: Number, default: 1200 },
        activity: { type: Number, default: 1500 },
      },
    },
    opts,
  ),
);

export const Course = model(
  "Course",
  new Schema(
    {
      code: { type: String, required: true, unique: true, trim: true },
      title: { type: String, required: true, trim: true },
      department: str,
      level: Number,
      credits: { type: Number, default: 3, min: 0.5, max: 6 },
      category: str,
      image: String,
      summary: String,
      description: String,
      prerequisites: [String],
      topics: [String],
      outcomes: [String],
      assessment: [{ label: String, weight: Number }],
      lectures: [{ title: String, youtubeId: String, minutes: Number, channel: String }],
      notes: [
        {
          title: String,
          kind: { type: String, enum: ["note", "pdf", "slides", "link"], default: "note" },
          url: String,
          body: String,
          description: String,
        },
      ],
      tags: [String],
      featured: { type: Boolean, default: false },
    },
    opts,
  ),
);

export const Section = model(
  "Section",
  new Schema(
    {
      semester: ref("Semester", { required: true, index: true }),
      course: ref("Course", { required: true, index: true }),
      name: { type: String, default: "A" },
      instructor: { name: String, title: String, email: String },
      schedule: [{ day: String, start: String, end: String, room: String }],
      capacity: { type: Number, default: 40, min: 1 },
      enrolled: { type: Number, default: 0, min: 0 },
    },
    opts,
  ),
);

const enrollmentSchema = new Schema(
  {
    student: { type: String, index: true },
    semester: ref("Semester", { required: true }),
    course: ref("Course", { required: true }),
    section: ref("Section"),
    status: { type: String, enum: ["enrolled", "completed", "dropped"], default: "enrolled" },
    marks: Number,
    grade: String,
    gradePoint: Number,
  },
  opts,
);
enrollmentSchema.index({ student: 1, semester: 1, course: 1 }, { unique: true });
export const Enrollment = model("Enrollment", enrollmentSchema);

const evaluationSchema = new Schema(
  {
    student: String,
    semester: ref("Semester", { required: true }),
    course: ref("Course", { required: true }),
    section: ref("Section", { required: true }),
    ratings: { type: Map, of: Number },
    comment: { type: String, maxlength: 1000 },
  },
  opts,
);
evaluationSchema.index({ student: 1, section: 1 }, { unique: true });
export const Evaluation = model("Evaluation", evaluationSchema);

export const Invoice = model(
  "Invoice",
  new Schema(
    {
      number: { type: String, unique: true },
      student: { type: String, index: true },
      semester: ref("Semester"),
      type: { type: String, enum: ["tuition", "transport", "other"], default: "tuition" },
      title: String,
      items: [{ label: String, amount: Number }],
      subtotal: Number,
      waiverPercent: { type: Number, default: 0 },
      waiverAmount: { type: Number, default: 0 },
      total: Number,
      paid: { type: Number, default: 0 },
      dueDate: Date,
      status: { type: String, enum: ["unpaid", "partial", "paid", "cancelled"], default: "unpaid" },
      installments: [{ no: Number, amount: Number, dueDate: Date, paid: { type: Boolean, default: false } }],
      refKind: String,
      refId: String,
    },
    opts,
  ),
);

export const Payment = model(
  "Payment",
  new Schema(
    {
      invoice: ref("Invoice", { required: true }),
      student: { type: String, index: true },
      amount: Number,
      method: { type: String, enum: ["wallet", "card", "bank"] },
      status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
      txnId: { type: String, unique: true },
      receiptNo: String,
      installmentNo: Number,
      payerRef: String,
      paidAt: Date,
    },
    opts,
  ),
);

export const TransportRoute = model(
  "TransportRoute",
  new Schema(
    {
      name: { type: String, required: true },
      code: String,
      busNo: String,
      image: String,
      stops: [{ name: String, time: String }],
      fee: { type: Number, default: 6000 },
      capacity: { type: Number, default: 50 },
      enrolled: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    opts,
  ),
);

export const TransportPass = model(
  "TransportPass",
  new Schema(
    {
      student: { type: String, index: true },
      semester: ref("Semester"),
      route: ref("TransportRoute"),
      stop: String,
      status: { type: String, enum: ["pending", "active", "cancelled", "expired"], default: "pending" },
      passNo: String,
      invoice: ref("Invoice"),
      validFrom: Date,
      validTo: Date,
    },
    opts,
  ),
);

export const Club = model(
  "Club",
  new Schema(
    {
      name: { type: String, required: true },
      category: str,
      tagline: String,
      description: String,
      image: String,
      advisor: String,
      president: String,
      founded: Number,
      meets: String,
      email: String,
      achievements: [String],
      tags: [String],
      social: { facebook: String, instagram: String, x: String },
    },
    opts,
  ),
);

const clubMemberSchema = new Schema(
  { club: ref("Club", { required: true }), student: { type: String, required: true }, role: { type: String, default: "member" } },
  opts,
);
clubMemberSchema.index({ club: 1, student: 1 }, { unique: true });
export const ClubMember = model("ClubMember", clubMemberSchema);

export const Event = model(
  "Event",
  new Schema(
    {
      title: { type: String, required: true },
      category: str,
      summary: String,
      description: String,
      image: String,
      venue: String,
      startAt: { type: Date, required: true },
      endAt: { type: Date, required: true },
      capacity: { type: Number, default: 100, min: 1 },
      registered: { type: Number, default: 0, min: 0 },
      club: ref("Club"),
      agenda: [{ time: String, title: String }],
      speakers: [{ name: String, title: String }],
      tags: [String],
    },
    opts,
  ),
);

const eventRegSchema = new Schema(
  { event: ref("Event", { required: true }), student: { type: String, required: true }, ticketNo: String },
  opts,
);
eventRegSchema.index({ event: 1, student: 1 }, { unique: true });
export const EventRegistration = model("EventRegistration", eventRegSchema);

export const Notice = model(
  "Notice",
  new Schema(
    {
      title: { type: String, required: true },
      body: String,
      category: str,
      priority: { type: String, enum: ["normal", "important", "urgent"], default: "normal" },
      pinned: { type: Boolean, default: false },
      attachments: [{ label: String, url: String }],
      author: String,
      publishedAt: { type: Date, default: Date.now },
    },
    opts,
  ),
);

export const Notification = model(
  "Notification",
  new Schema(
    { user: { type: String, index: true }, type: String, title: String, body: String, link: String, read: { type: Boolean, default: false } },
    opts,
  ),
);

export const Conversation = model(
  "Conversation",
  new Schema(
    {
      kind: { type: String, enum: ["direct", "group"], default: "direct" },
      name: String,
      image: String,
      refKind: String,
      refId: String,
      members: { type: [String], index: true },
      directKey: { type: String, unique: true, sparse: true },
      last: { text: String, sender: String, at: Date },
      unread: { type: Map, of: Number, default: {} },
    },
    opts,
  ),
);

const messageSchema = new Schema(
  { conversation: ref("Conversation", { required: true }), sender: String, text: String, readBy: [String] },
  opts,
);
messageSchema.index({ conversation: 1, createdAt: -1 });
export const Message = model("Message", messageSchema);

const progressSchema = new Schema({ student: String, course: ref("Course"), completed: [String] }, opts);
progressSchema.index({ student: 1, course: 1 }, { unique: true });
export const CourseProgress = model("CourseProgress", progressSchema);

export const ContactMessage = model(
  "ContactMessage",
  new Schema({ name: String, email: String, subject: String, message: String }, opts),
);
