#!/usr/bin/env node
"use strict";
const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const composeDb = path.join(root, "database", "compose.yaml");
const svc = "pgdatabase";

const run = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: "inherit", shell: isWin, ...opts });
const runQuiet = (cmd, opts = {}) => {
  try {
    execSync(cmd, { cwd: root, encoding: "utf8", shell: isWin, ...opts });
    return true;
  } catch {
    return false;
  }
};

function portInUse(port) {
  const net = require("net");
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => { resolve(true); s.close(); });
    s.once("listening", () => { resolve(false); s.close(); });
    s.listen(port, "127.0.0.1");
  });
}

async function main() {
  console.log("🚀 Starting InvoiceDoc2 Database...");
  if (!runQuiet("docker info", { stdio: "pipe" })) {
    console.error("❌ Docker is not running. Please start Docker Desktop first.");
    process.exit(1);
  }

  const inUse = await portInUse(15432);
  if (inUse) {
    let name = "";
    try {
      name = execSync("docker ps --filter publish=15432 --format \"{{.Names}}\"", { cwd: root, encoding: "utf8", shell: isWin }).trim().split("\n")[0] || "";
    } catch {}
    if (name) {
      console.log("⚠️  Port 15432 in use by " + name + ". Stopping it...");
      runQuiet("docker stop " + name);
      if (!isWin) run("sleep 2"); else run("timeout /t 2 /nobreak > nul", { shell: true });
    } else {
      console.error("❌ Port 15432 is in use. Free it or change the port in database/compose.yaml");
      process.exit(1);
    }
  }

  console.log("📦 Starting database container...");
  run(`docker-compose -f "${composeDb}" up -d ${svc}`);
  console.log("⏳ Waiting for database...");
  if (isWin) run("timeout /t 5 /nobreak > nul", { shell: true });
  else run("sleep 5");

  for (let i = 0; i < 30; i++) {
    if (runQuiet(`docker-compose -f "${composeDb}" exec -T ${svc} pg_isready -U root`, { stdio: "pipe" })) {
      console.log("✅ Database is ready!");
      break;
    }
    if (i === 29) console.log("⚠️  Database slow to start");
    else if (isWin) run("timeout /t 1 /nobreak > nul", { shell: true });
    else run("sleep 1");
  }

  console.log("\n🔧 Setting up schema...");
  const setupPath = path.join(root, "database", "setup_db.js");
  const setupSh = path.join(root, "database", "setup_db.sh");
  if (fs.existsSync(setupPath)) {
    const r = spawnSync("node", [setupPath], { cwd: root, stdio: "inherit", shell: isWin });
    if (r.status !== 0) console.log("⚠️  Setup had errors (exit " + r.status + ")");
  } else if (fs.existsSync(setupSh) && !isWin) {
    run("cd database && ./setup_db.sh");
  } else {
    console.log("⚠️  Run manually: node database/setup_db.js  or  cd database && ./setup_db.sh");
  }
  console.log("\n✅ Database started. Host: localhost:15432 | DB: invoices_db | User: root");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
