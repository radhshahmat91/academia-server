import { Enrollment, Evaluation, Semester } from "../models";

/** Every course the student can evaluate right now, with whether it is done. */
export async function evaluationList(student: string) {
  const sems: any[] = await Semester.find({ evaluationOpen: true }).select("name status").lean();
  if (!sems.length) return [];
  const [rows, evals]: [any[], any[]] = await Promise.all([
    Enrollment.find({ student, semester: { $in: sems.map((s) => s._id) }, status: { $in: ["enrolled", "completed"] } })
      .populate("course", "code title category image")
      .populate("section", "name instructor")
      .populate("semester", "name status")
      .lean() as any,
    Evaluation.find({ student }).select("section").lean() as any,
  ]);
  const done = new Set(evals.map((e) => String(e.section)));
  return rows
    .filter((r) => r.section && r.course)
    .map((r) => ({
      enrollmentId: String(r._id),
      semester: r.semester,
      course: r.course,
      section: r.section,
      done: done.has(String(r.section._id)),
    }));
}
