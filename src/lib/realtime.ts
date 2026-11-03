import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyToken, type AuthUser } from "../auth";
import { config } from "../config";
import { Conversation } from "../models";
import { markRead, postMessage } from "./chat";
import { broadcast, emitToUsers, presence, setIO } from "./emit";

type Ack = (res: { ok: boolean; message?: string; data?: unknown }) => void;
const reply = (ack: unknown) => (typeof ack === "function" ? (ack as Ack) : () => {});

export function initRealtime(http: HttpServer) {
  const io = new Server(http, {
    cors: { origin: config.clientOrigins, credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });
  setIO(io);

  // Every socket must present the same BetterAuth JWT that the REST API accepts.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("missing token");
      socket.data.user = await verifyToken(String(token));
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const me = socket.data.user as AuthUser;
    socket.join(`user:${me.id}`);
    if (presence.connect(me.id)) broadcast("presence:update", { userId: me.id, online: true });
    socket.emit("presence:list", presence.ids());

    socket.on("message:send", async (body: { conversationId?: string; text?: string }, ack?: Ack) => {
      const done = reply(ack);
      try {
        const sent = await postMessage(me.id, String(body?.conversationId ?? ""), String(body?.text ?? ""));
        done({ ok: true, data: sent.message });
      } catch (e: any) {
        done({ ok: false, message: e?.message ?? "Could not send the message" });
      }
    });

    socket.on("typing", async (body: { conversationId?: string; typing?: boolean }) => {
      const conv: any = await Conversation.findOne({ _id: String(body?.conversationId ?? ""), members: me.id }).select("members").lean().catch(() => null);
      if (!conv) return;
      emitToUsers(
        conv.members.filter((m: string) => m !== me.id),
        "typing",
        { conversationId: String(conv._id), userId: me.id, name: me.name, typing: !!body.typing },
      );
    });

    socket.on("conversation:read", async (body: { conversationId?: string }, ack?: Ack) => {
      const done = reply(ack);
      try {
        await markRead(me.id, String(body?.conversationId ?? ""));
        done({ ok: true });
      } catch (e: any) {
        done({ ok: false, message: e?.message });
      }
    });

    socket.on("disconnect", () => {
      if (presence.disconnect(me.id)) broadcast("presence:update", { userId: me.id, online: false });
    });
  });

  return io;
}
