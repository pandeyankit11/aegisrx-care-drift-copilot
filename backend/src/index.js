require("dotenv").config();

const express = require("express");
const cors = require("cors");

const apiRoutes = require("./api/routes");

const app = express();

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";

const corsOptions = process.env.ALLOWED_ORIGIN
  ? { origin: process.env.ALLOWED_ORIGIN }
  : {};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, HOST, () => {
  console.log(`AegisRx API listening on ${HOST}:${PORT}`);
});
