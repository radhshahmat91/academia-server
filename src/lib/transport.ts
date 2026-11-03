import { Semester, TransportPass } from "../models";

const DAY = 86_400_000;

/** Called when a transport invoice becomes fully paid. */
export async function activatePass(invoice: any) {
  const pass: any = await TransportPass.findOne({ invoice: invoice._id });
  if (!pass || pass.status === "active") return pass;
  const sem: any = await Semester.findById(pass.semester).select("startDate endDate").lean();
  pass.status = "active";
  pass.validFrom = sem?.startDate ?? new Date();
  pass.validTo = sem?.endDate ?? new Date(Date.now() + 120 * DAY);
  await pass.save();
  return pass;
}
