#!/usr/bin/env node
"use strict";
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const composeDb = path.join(root, "database", "compose.yaml");
const svc = "pgdatabase";

function runQuiet(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8", shell: isWin, ...opts });
  } catch {
    return null;
  }
}

let container = runQuiet(`docker-compose -f "${composeDb}" ps -q ${svc}`, { stdio: "pipe" });
container = container ? container.trim() : "";
if (!container) {
  console.error("❌ Database container is not running. Start it: npm run docker:db:start");
  process.exit(1);
}

const running = runQuiet("docker ps -q --no-trunc", { stdio: "pipe" }) || "";
if (!running.includes(container)) {
  console.error("❌ Database container is not running. Start it: npm run docker:db:start");
  process.exit(1);
}

let name = runQuiet(`docker ps --filter "id=${container}" --format "{{.Names}}"`, { stdio: "pipe" });
name = name ? name.trim() : container;

console.log("🔍 Checking InvoiceDoc2 Database...");
console.log("✅ Container " + name + " is running\n");
console.log("📊 Tables:");
try {
  execSync(`docker exec "${name}" psql -U root -d invoices_db -c "\\dt"`, { cwd: root, stdio: "inherit", shell: isWin });
} catch {}
console.log("\n📈 Counts:");
for (const t of ["customer", "product", "invoice", "invoice_line_item"]) {
  const r = runQuiet(`docker exec "${name}" psql -U root -d invoices_db -t -c "SELECT COUNT(*) FROM ${t};"`, { stdio: "pipe" });
  const n = (r && r.trim()) || "0";
  console.log("   " + t + ": " + n);
}
console.log("\n📍 localhost:15432 | invoices_db | root/root");
