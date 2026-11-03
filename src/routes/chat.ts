import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { getOrCreateDirect, listConversations, markRead, postMessage, summarize } from "../lib/chat";
import { presence } from "../lib/emit";
import { forbidden, oid, parse } from "../lib/http";
import { Conversation, Message, User } from "../models";

const r = Router();

r.get("/chat/conversations", requireAuth, async (req, res) => {
  res.json({ items: await listConversations(req.user!.id), online: presence.ids() });
});

r.post("/chat/direct", requireAuth, async (req, res) => {
  const { userId } = parse(z.object({ userId: z.string().min(1) }), req.body);
  res.json(await getOrCreateDirect(req.user!.id, userId));
});

r.get("/chat/conversations/:id/messages", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const id = oid(req.params.id);
  const conv: any = await Conversation.findOne({ _id: id, members: me }).lean();
  if (!conv) throw forbidden("You are not part of this conversation");
  const limit = Math.min(60, Number(req.query.limit) || 40);
  const before = typeof req.query.before === "string" ? new Date(req.query.before) : null;
  const rows: any[] = await Message.find({ conversation: id, ...(before && !isNaN(+before) ? { createdAt: { $lt: before } } : {}) })
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).reverse();
  const ids = [...new Set([...items.map((m) => m.sender), ...conv.members])];
  const users: any[] = await User.find({ _id: { $in: ids } }).select("name image department").lean();
  const people = Object.fromEntries(users.map((u) => [String(u._id), { id: String(u._id), name: u.name, image: u.image ?? null, department: u.department ?? null }]));
  const [summary] = await summarize([conv], me);
  res.json({ conversation: summary, items, hasMore, people, members: conv.members });
});

r.post("/chat/conversations/:id/messages", requireAuth, async (req, res) => {
  const { text } = parse(z.object({ text: z.string() }), req.body);
  const sent = await postMessage(req.user!.id, String(oid(req.params.id)), text);
  res.status(201).json(sent.message);
});

r.post("/chat/conversations/:id/read", requireAuth, async (req, res) => {
  await markRead(req.user!.id, String(oid(req.params.id)));
  res.json({ ok: true });
});

export default r;
