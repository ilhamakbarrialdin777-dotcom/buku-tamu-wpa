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

  // Legacy fallback or bulk save (does merging to be safe)
  app.post("/api/records", (req, res) => {
    const records = req.body;
    if (Array.isArray(records)) {
      const existing = readRecords();
      const map = new Map();
      existing.forEach(r => r && r.id && map.set(r.id, r));
      records.forEach(r => r && r.id && map.set(r.id, r));
      const merged = Array.from(map.values());
      writeRecords(merged);
      res.json({ success: true, count: merged.length });
    } else {
      res.status(400).json({ error: "Invalid records format" });
    }
  });

  // Smart Upsert for a single record to prevent race conditions
  app.post("/api/records/upsert", (req, res) => {
    const record = req.body;
    if (record && record.id) {
      const records = readRecords();
      const index = records.findIndex(r => r.id === record.id);
      if (index !== -1) {
        records[index] = { ...records[index], ...record };
      } else {
        records.unshift(record);
      }
      writeRecords(records);
      res.json({ success: true, record });
    } else {
      res.status(400).json({ error: "Invalid record format" });
    }
  });

  // Specific delete endpoint
  app.delete("/api/records/:id", (req, res) => {
    const { id } = req.params;
    const records = readRecords();
    const filtered = records.filter(r => r.id !== id);
    writeRecords(filtered);
    res.json({ success: true });
  });

  // Clear endpoint
  app.post("/api/records/clear", (req, res) => {
    writeRecords([]);
    res.json({ success: true });
  });

  // Bulk restore endpoint
  app.post("/api/records/restore", (req, res) => {
    const records = req.body;
    if (Array.isArray(records)) {
      writeRecords(records);
      res.json({ success: true, count: records.length });
    } else {
      res.status(400).json({ error: "Invalid format" });
    }
  });

  app.get("/api/logs", (req, res) => {
    res.json(readLogs());
  });

  // Legacy fallback or bulk save (does merging to be safe)
  app.post("/api/logs", (req, res) => {
    const logs = req.body;
    if (Array.isArray(logs)) {
      const existing = readLogs();
      const map = new Map();
      existing.forEach(l => l && l.id && map.set(l.id, l));
      logs.forEach(l => l && l.id && map.set(l.id, l));
      const merged = Array.from(map.values());
      writeLogs(merged);
      res.json({ success: true, count: merged.length });
    } else {
      res.status(400).json({ error: "Invalid logs format" });
    }
  });

  // Smart Upsert for a single log
  app.post("/api/logs/upsert", (req, res) => {
    const log = req.body;
    if (log && log.id) {
      const logs = readLogs();
      const index = logs.findIndex(l => l.id === log.id);
      if (index !== -1) {
        logs[index] = { ...logs[index], ...log };
      } else {
        logs.unshift(log);
      }
      writeLogs(logs);
      res.json({ success: true, log });
    } else {
      res.status(400).json({ error: "Invalid log format" });
    }
  });

  // Clear logs endpoint
  app.post("/api/logs/clear", (req, res) => {
    writeLogs([]);
    res.json({ success: true });
  });

  // Bulk restore logs endpoint
  app.post("/api/logs/restore", (req, res) => {
    const logs = req.body;
    if (Array.isArray(logs)) {
      writeLogs(logs);
      res.json({ success: true, count: logs.length });
    } else {
      res.status(400).json({ error: "Invalid format" });
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
