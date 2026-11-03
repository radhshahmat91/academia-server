import { Conversation, Message, User } from "../models";
import { emitToUsers } from "./emit";
import { bad, forbidden, notFound, ser } from "./http";

export const dKey = (a: string, b: string) => [a, b].sort().join(":");

export async function summarize(convs: any[], me: string) {
  const otherOf = (c: any) => c.members.find((m: string) => m !== me) ?? me;
  const otherIds = convs.filter((c) => c.kind === "direct").map(otherOf);
  const users: any[] = otherIds.length ? await User.find({ _id: { $in: otherIds } }).select("name image department").lean() : [];
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return convs.map((c) => {
    const other = c.kind === "direct" ? byId.get(otherOf(c)) : null;
    return {
      id: String(c._id),
      kind: c.kind,
      name: other?.name ?? c.name ?? "Conversation",
      image: other?.image ?? c.image ?? null,
      refKind: c.refKind ?? null,
      refId: c.refId ?? null,
      otherId: other ? String(other._id) : null,
      department: other?.department ?? null,
      memberCount: c.members.length,
      last: c.last?.at ? c.last : null,
      unread: Number(c.unread?.[me] ?? 0),
    };
  });
}

export async function listConversations(me: string) {
  const convs = await Conversation.find({ members: me }).sort({ "last.at": -1, updatedAt: -1 }).lean();
  return summarize(convs, me);
}

export async function getOrCreateDirect(me: string, other: string) {
  if (me === other) throw bad("You can't message yourself");
  if (!(await User.exists({ _id: other }))) throw notFound("That student was not found");
  const key = dKey(me, other);
  const conv = await Conversation.findOneAndUpdate(
    { directKey: key },
    { $setOnInsert: { kind: "direct", members: [me, other], directKey: key } },
    { upsert: true, new: true, lean: true },
  );
  return (await summarize([conv], me))[0];
}

export async function postMessage(me: string, conversationId: string, rawText: string) {
  const text = String(rawText ?? "").trim();
  if (!text) throw bad("Write a message first");
  if (text.length > 2000) throw bad("Messages can be up to 2,000 characters");
  const conv: any = await Conversation.findOne({ _id: conversationId, members: me }).lean();
  if (!conv) throw forbidden("You are not part of this conversation");
  const msg = await Message.create({ conversation: conv._id, sender: me, text, readBy: [me] });
  const inc: Record<string, number> = {};
  for (const m of conv.members as string[]) if (m !== me) inc[`unread.${m}`] = 1;
  const last = { text: text.slice(0, 140), sender: me, at: msg.createdAt };
  await Conversation.updateOne({ _id: conv._id }, { $set: { last }, ...(Object.keys(inc).length ? { $inc: inc } : {}) });
  const person: any = await User.findById(me).select("name image").lean();
  const payload = {
    message: ser(msg),
    conversationId: String(conv._id),
    last: ser(last),
    person: { id: me, name: person?.name ?? "Student", image: person?.image ?? null },
  };
  emitToUsers(conv.members, "message:new", payload);
  return payload;
}

export async function markRead(me: string, conversationId: string) {
  const conv: any = await Conversation.findOne({ _id: conversationId, members: me }).lean();
  if (!conv) throw forbidden("You are not part of this conversation");
  await Conversation.updateOne({ _id: conv._id }, { $set: { [`unread.${me}`]: 0 } });
  await Message.updateMany({ conversation: conv._id, readBy: { $ne: me } }, { $addToSet: { readBy: me } });
  emitToUsers(conv.members, "message:read", { conversationId: String(conv._id), userId: me, at: new Date().toISOString() });
}

export async function joinGroup(refKind: "club" | "course", refId: string, name: string, image: string | undefined, userId: string) {
  await Conversation.updateOne(
    { refKind, refId },
    { $setOnInsert: { kind: "group", name, image, refKind, refId }, $addToSet: { members: userId } },
    { upsert: true },
  );
}

export async function leaveGroup(refKind: "club" | "course", refId: string, userId: string) {
  await Conversation.updateOne({ refKind, refId }, { $pull: { members: userId } });
}
