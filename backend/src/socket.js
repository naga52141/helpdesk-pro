const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // Socket.IO doesn't share Express's auth middleware — tokens arrive via the
  // client's `auth` handshake payload instead of a header, verified the same way.
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Missing token"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id, role: payload.role, name: payload.name };
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === "agent" || socket.user.role === "admin") {
      socket.join("staff");
    }

    socket.on("join-ticket", (ticketId) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on("leave-ticket", (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function emitToStaff(event, payload) {
  if (io) io.to("staff").emit(event, payload);
}

function emitToTicket(ticketId, event, payload) {
  if (io) io.to(`ticket:${ticketId}`).emit(event, payload);
}

module.exports = { initSocket, emitToUser, emitToStaff, emitToTicket };
