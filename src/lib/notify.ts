import { Notification } from "../models";
import { emitToUser } from "./emit";
import { ser } from "./http";

type Note = { type: string; title: string; body?: string; link?: string };

/** Stores a notification for each user and pushes it to their open tabs in real time. */
export async function notify(to: string | string[], n: Note) {
  const ids = [...new Set(Array.isArray(to) ? to : [to])].filter(Boolean);
  if (!ids.length) return;
  const docs = await Notification.insertMany(ids.map((user) => ({ user, ...n })));
  for (const d of docs) emitToUser(d.user as string, "notification:new", ser(d));
}
