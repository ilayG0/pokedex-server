const { Server } = require("socket.io");
const { battleService } = require("../services/battle.service");
const { registerBattleHandlers } = require("./battle.handlers");

function attachSocket(server) {
  const allowedOrigins = [
    "http://localhost:4200",
    "http://ec2-98-88-19-150.compute-1.amazonaws.com",
  ];

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const queue = [];
  const sessionsBySocket = new Map();

  function removeFromQueue(socketId) {
    const idx = queue.findIndex((x) => x.socketId === socketId);
    if (idx !== -1) queue.splice(idx, 1);
  }

  async function tryMatch() {
    while (queue.length >= 2) {
      const p1 = queue.shift();
      const p2 = queue.shift();

      const roomId = `room_${p1.socketId}_${p2.socketId}`;

      sessionsBySocket.set(p1.socketId, { roomId, opponent: p2 });
      sessionsBySocket.set(p2.socketId, { roomId, opponent: p1 });

      io.sockets.sockets.get(p1.socketId)?.join(roomId);
      io.sockets.sockets.get(p2.socketId)?.join(roomId);

      const battleState = await battleService.createBattle({
        player1: {
          userId: p1.userId,
          pokemonId: p1.payload.pokemonId,
          pokemonName: p1.payload.name,
          moves: p1.payload.moves,
        },
        player2: {
          userId: p2.userId,
          pokemonId: p2.payload.pokemonId,
          pokemonName: p2.payload.name,
          moves: p2.payload.moves,
        },
      });

      io.to(p1.socketId).emit("match_found", {
        roomId,
        battleId: battleState.id,
        selfUserId: p1.userId,
        opponent: p2.payload,
      });

      io.to(p2.socketId).emit("match_found", {
        roomId,
        battleId: battleState.id,
        selfUserId: p2.userId,
        opponent: p1.payload,
      });
    }
  }

  io.on("connection", (socket) => {
    console.log("⚡ socket connected:", socket.id);

    registerBattleHandlers(io, socket);

    socket.on("find_match", (payload) => {
      console.log("📥 find_match from:", socket.id, "payload:", payload);

      removeFromQueue(socket.id);
      queue.push({
        socketId: socket.id,
        userId: socket.id,
        payload,
      });

      console.log("👥 queue size:", queue.length);

      socket.emit("match_status", { status: "queued" });

      tryMatch().catch((err) => {
        console.error("❌ error in tryMatch:", err);
      });
    });

    socket.on("cancel_match", () => {
      console.log("❌ cancel_match from:", socket.id);
      removeFromQueue(socket.id);
      socket.emit("match_status", { status: "idle" });
    });

    socket.on("disconnect", () => {
      removeFromQueue(socket.id);

      const session = sessionsBySocket.get(socket.id);
      if (session) {
        const { roomId, opponent } = session;
        sessionsBySocket.delete(socket.id);

        const oppSession = sessionsBySocket.get(opponent.socketId);
        if (oppSession?.roomId === roomId) {
          sessionsBySocket.delete(opponent.socketId);
          io.to(opponent.socketId).emit("opponent_left", { roomId });
        }
      }
    });
  });

  return io;
}

module.exports = { attachSocket };
