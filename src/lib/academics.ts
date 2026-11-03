import { Enrollment, Evaluation } from "../models";

export const GRADE_SCALE = [
  { min: 80, grade: "A+", point: 4 },
  { min: 75, grade: "A", point: 3.75 },
  { min: 70, grade: "A-", point: 3.5 },
  { min: 65, grade: "B+", point: 3.25 },
  { min: 60, grade: "B", point: 3 },
  { min: 55, grade: "B-", point: 2.75 },
  { min: 50, grade: "C+", point: 2.5 },
  { min: 45, grade: "C", point: 2.25 },
  { min: 40, grade: "D", point: 2 },
  { min: 0, grade: "F", point: 0 },
];
export const gradeFor = (marks: number) => GRADE_SCALE.find((s) => marks >= s.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];

export const EVAL_QUESTIONS = [
  { key: "outline", text: "The course outline and learning goals were clear" },
  { key: "clarity", text: "The instructor explained concepts clearly" },
  { key: "pace", text: "Class time was used well and the pace suited me" },
  { key: "assessment", text: "Quizzes and exams matched what was taught" },
  { key: "support", text: "The instructor was approachable and gave useful feedback" },
  { key: "materials", text: "Notes, slides and videos helped me learn" },
  { key: "workload", text: "The workload was reasonable for the credit hours" },
  { key: "overall", text: "Overall, I would recommend this course to a friend" },
];

const wavg = (rows: { gradePoint?: number | null; credits: number }[]) => {
  const credits = rows.reduce((s, r) => s + r.credits, 0);
  if (!credits) return null;
  return Math.round((rows.reduce((s, r) => s + (r.gradePoint ?? 0) * r.credits, 0) / credits) * 100) / 100;
};

/** Semester-wise record for one student. Results of a closed semester stay locked until its evaluations are done. */
export async function buildHistory(student: string) {
  const [rows, evals]: [any[], any[]] = await Promise.all([
    Enrollment.find({ student, status: { $in: ["enrolled", "completed"] } })
      .populate("course", "code title credits department category image")
      .populate("section", "name instructor schedule")
      .populate("semester", "name season year startDate endDate status evaluationOpen")
      .lean() as any,
    Evaluation.find({ student }).select("section").lean() as any,
  ]);
  const evaluated = new Set(evals.map((e) => String(e.section)));
  const bySem = new Map<string, any>();
  for (const r of rows) {
    if (!r.semester || !r.course) continue;
    const key = String(r.semester._id);
    if (!bySem.has(key)) bySem.set(key, { semester: r.semester, rows: [] });
    bySem.get(key).rows.push(r);
  }
  const semesters = [...bySem.values()]
    .sort((a, b) => +new Date(a.semester.startDate) - +new Date(b.semester.startDate))
    .map(({ semester, rows }) => {
      const pending = rows.filter((r: any) => r.section && !evaluated.has(String(r.section._id))).length;
      const locked = semester.status === "completed" && semester.evaluationOpen && pending > 0;
      const graded = rows.filter((r: any) => r.grade);
      const courses = rows.map((r: any) => ({
        id: String(r._id),
        course: r.course,
        section: r.section,
        status: r.status,
        evaluated: r.section ? evaluated.has(String(r.section._id)) : true,
        marks: locked ? null : (r.marks ?? null),
        grade: locked ? null : (r.grade ?? null),
        gradePoint: locked ? null : (r.gradePoint ?? null),
      }));
      return {
        semester,
        courses,
        credits: rows.reduce((s: number, r: any) => s + r.course.credits, 0),
        earnedCredits: graded.filter((r: any) => r.gradePoint > 0).reduce((s: number, r: any) => s + r.course.credits, 0),
        gpa: locked ? null : wavg(graded.map((r: any) => ({ gradePoint: r.gradePoint, credits: r.course.credits }))),
        locked,
        pendingEvaluations: pending,
      };
    });
  const counted = semesters.filter((s) => !s.locked).flatMap((s) => s.courses.filter((c: any) => c.grade));
  const cgpa = wavg(counted.map((c: any) => ({ gradePoint: c.gradePoint, credits: c.course.credits })));
  return {
    semesters,
    cgpa,
    creditsEarned: counted.filter((c: any) => c.gradePoint > 0).reduce((s: number, c: any) => s + c.course.credits, 0),
  };
}
