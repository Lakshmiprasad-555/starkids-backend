require("dotenv").config();
require("express-async-errors");

const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const compression = require("compression");
const rateLimit   = require("express-rate-limit");

const connectDB  = require("./config/db");
const { initFirebase } = require("./config/firebase");
const { notFound, errorHandler } = require("./middleware/error");
const { startCron } = require("./utils/cron");

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "*";

app.use(helmet());
app.use(compression());
app.use(cors({ origin: allowedOrigins, methods: ["GET","POST","PUT","DELETE"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(process.env.NODE_ENV === "development" ? morgan("dev") : morgan("tiny"));
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests, slow down" },
}));
app.use((req, res, next) => {
  console.log("🌍", req.method, req.url);
  next();
});
app.get("/", (_, res) => res.json({
  success: true,
  school: process.env.SCHOOL_NAME,
  status: "running",
  version: "2.0.0",
}));

app.use("/api/auth",                require("./routes/auth"));
app.use("/api/dashboard",           require("./routes/dashboard"));
app.use("/api/teachers",            require("./routes/teacher"));
app.use("/api/students",            require("./routes/student"));
app.use("/api/attendance",          require("./routes/attendance"));
app.use("/api/teacher-attendance",  require("./routes/teacherAttendance"));
app.use("/api/homework",            require("./routes/homework"));
app.use("/api/marks",               require("./routes/marks"));
app.use("/api/notices",             require("./routes/notice"));
app.use("/api/fees",                require("./routes/fee"));
app.use("/api/timetable",           require("./routes/timetable"));
app.use("/api/messages",            require("./routes/message"));
app.use("/api/leave",               require("./routes/leave"));
app.use("/api/events",              require("./routes/event"));
app.use("/api/gallery",             require("./routes/gallery"));
app.use("/api/transport",           require("./routes/transport"));

app.use(notFound);
app.use(errorHandler);

(async () => {
  await connectDB();
  initFirebase();
  startCron(); // Only fee reminders run — auto-generate is DISABLED (manual from principal only)
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log("\n================================================");
    console.log("  Star Kids Connect is LIVE!");
    console.log("  School  :", process.env.SCHOOL_NAME);
    console.log("  Port    :", PORT);
    console.log("  Mode    :", process.env.NODE_ENV || "development");
    console.log("================================================\n");
  });
})();
