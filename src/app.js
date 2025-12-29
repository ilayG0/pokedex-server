const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const pokemonsRoutes = require("./routes/pokemons.routes");
const favoriteRoutes = require("./routes/favorite.routes");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "ok" ,version: "2"});
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/pokemons", pokemonsRoutes);
  app.use("/api/favorite", favoriteRoutes);

  app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);

    res.status(500).json({
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  return app;
}

module.exports = { createApp };
