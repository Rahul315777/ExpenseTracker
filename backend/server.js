require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const routes = require("./routes");

const app = express();
const origins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => res.send("Expense Tracker API is running"));
app.use("/api", routes);
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

const PORT = process.env.PORT || 4000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => { console.error("Failed to start:", err.message); process.exit(1); });
