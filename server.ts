import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { INITIAL_GUEST_RECORDS, INITIAL_SECURITY_LOGS } from "./src/utils";

const RECORDS_FILE = path.join(process.cwd(), "records_db.json");
const LOGS_FILE = path.join(process.cwd(), "logs_db.json");

// Helper to read records with initial seeding
function readRecords(): any[] {
  try {
    if (fs.existsSync(RECORDS_FILE)) {
      const data = fs.readFileSync(RECORDS_FILE, "utf-8");
      return JSON.parse(data);
    } else {
      // Seed initial data
      fs.writeFileSync(RECORDS_FILE, JSON.stringify(INITIAL_GUEST_RECORDS, null, 2), "utf-8");
      return INITIAL_GUEST_RECORDS;
    }
  } catch (err) {
    console.error("Error reading records file:", err);
  }
  return INITIAL_GUEST_RECORDS;
}

// Helper to write records
function writeRecords(records: any[]) {
  try {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing records file:", err);
  }
}

// Helper to read logs with initial seeding
function readLogs(): any[] {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, "utf-8");
      return JSON.parse(data);
    } else {
      // Seed initial data
      fs.writeFileSync(LOGS_FILE, JSON.stringify(INITIAL_SECURITY_LOGS, null, 2), "utf-8");
      return INITIAL_SECURITY_LOGS;
    }
  } catch (err) {
    console.error("Error reading logs file:", err);
  }
  return INITIAL_SECURITY_LOGS;
}

// Helper to write logs
function writeLogs(logs: any[]) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing logs file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API endpoints
  app.get("/api/records", (req, res) => {
    res.json(readRecords());
  });

  app.post("/api/records", (req, res) => {
    const records = req.body;
    if (Array.isArray(records)) {
      writeRecords(records);
      res.json({ success: true, count: records.length });
    } else {
      res.status(400).json({ error: "Invalid records format" });
    }
  });

  app.get("/api/logs", (req, res) => {
    res.json(readLogs());
  });

  app.post("/api/logs", (req, res) => {
    const logs = req.body;
    if (Array.isArray(logs)) {
      writeLogs(logs);
      res.json({ success: true, count: logs.length });
    } else {
      res.status(400).json({ error: "Invalid logs format" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
