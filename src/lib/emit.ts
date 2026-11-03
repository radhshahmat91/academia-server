import type { Server } from "socket.io";

let io: Server | null = null;
const online = new Map<string, number>();

export const setIO = (server: Server) => {
  io = server;
};
export const emitToUser = (userId: string, event: string, payload: unknown) => {
  io?.to(`user:${userId}`).emit(event, payload);
};
export const emitToUsers = (ids: string[], event: string, payload: unknown) => {
  for (const id of new Set(ids)) emitToUser(id, event, payload);
};
export const broadcast = (event: string, payload: unknown) => {
  io?.emit(event, payload);
};

export const presence = {
  connect(id: string) {
    const n = (online.get(id) ?? 0) + 1;
    online.set(id, n);
    return n === 1;
  },
  disconnect(id: string) {
    const n = (online.get(id) ?? 1) - 1;
    if (n <= 0) online.delete(id);
    else online.set(id, n);
    return n <= 0;
  },
  ids: () => [...online.keys()],
  has: (id: string) => online.has(id),
};
