#!/usr/bin/env node
"use strict";
const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const scriptDir = path.resolve(__dirname);
const root = path.join(scriptDir, "..");
const sqlPath = path.join(scriptDir, "sql", "sql_run.sql");
const isWin = process.platform === "win32";
const composePath = path.join(scriptDir, "compose.yaml");

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: opts.cwd || root, stdio: "inherit", shell: isWin, ...opts });
}

function runQuiet(cmd, opts = {}) {
  try {
    execSync(cmd, { cwd: opts.cwd || root, encoding: "utf8", stdio: "pipe", shell: isWin, ...opts });
    return true;
  } catch {
    return false;
  }
}

function dockerExecSql(containerName, sqlContent) {
  const r = spawnSync(
    "docker",
    ["exec", "-i", containerName, "psql", "-U", "root", "-d", "invoices_db"],
    { input: sqlContent, cwd: root, stdio: ["pipe", "inherit", "inherit"] }
  );
  return r.status === 0;
}

function dockerExecCmd(containerName, psqlArgs) {
  const r = spawnSync("docker", ["exec", containerName, "psql", "-U", "root", "-d", "invoices_db", ...psqlArgs], { cwd: root, stdio: "inherit" });
  return r.status === 0;
}

function help() {
  console.log("\n❌ Unable to connect to database\n");
  console.log("Please check:");
  console.log("1. Is Docker Desktop running?");
  console.log("2. Run this command first: npm run docker:db:start");
  console.log("3. Or run SQL directly:");
  console.log("   PGPASSWORD=root psql -h localhost -p 15432 -U root -d invoices_db -f database/sql/sql_run.sql");
  console.log("\n4. Or use Adminer (Web UI): http://localhost:8080");
  console.log("   - System: PostgreSQL");
  console.log("   - Server: pgdatabase");
  console.log("   - Username: root");
  console.log("   - Password: root");
  console.log("   - Database: invoices_db");
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error("❌ SQL file not found: sql/sql_run.sql");
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, "utf8");

console.log("🔧 Setting up database...");
console.log("📁 Working directory: " + scriptDir);

// Try docker container by name
let names = [];
try {
  const out = execSync("docker ps --format \"{{.Names}}\"", { cwd: root, encoding: "utf8", shell: isWin });
  names = out.trim().split(/\r?\n/).filter(Boolean);
} catch {}

if (names.includes("invoicedoc-db-dev")) {
  console.log("✅ Docker container (invoicedoc-db-dev) is running");
  console.log("📝 Running SQL script via Docker...");
  if (dockerExecSql("invoicedoc-db-dev", sqlContent)) {
    console.log("✅ Tables created successfully!");
    console.log("🔍 Verifying created tables:");
    dockerExecCmd("invoicedoc-db-dev", ["-c", "\\dt"]);
    process.exit(0);
  }
}

if (runQuiet(`docker-compose -f "${composePath}" ps -q pgdatabase`)) {
  const status = execSync(`docker-compose -f "${composePath}" ps pgdatabase`, { cwd: root, encoding: "utf8", shell: isWin });
  if (status.includes("Up")) {
    console.log("✅ Docker container (pgdatabase) is running");
    console.log("📝 Running SQL script via Docker...");
    const r = spawnSync(
      "docker-compose",
      ["-f", composePath, "exec", "-T", "pgdatabase", "psql", "-U", "root", "-d", "invoices_db"],
      { input: sqlContent, cwd: root, stdio: ["pipe", "inherit", "inherit"], shell: isWin }
    );
    if (r.status === 0) {
      console.log("✅ Tables created successfully!");
      console.log("🔍 Verifying created tables:");
      run(`docker-compose -f "${composePath}" exec -T pgdatabase psql -U root -d invoices_db -c "\\dt"`);
      process.exit(0);
    }
  }
}

// Try psql (localhost:15432 then 5432)
const env = { ...process.env, PGPASSWORD: "root" };
let r = spawnSync("psql", ["-h", "localhost", "-p", "15432", "-U", "root", "-d", "invoices_db", "-f", sqlPath], { cwd: scriptDir, stdio: "inherit", env });
if (r.status === 0) {
  console.log("✅ Tables created successfully!");
  console.log("🔍 Verifying created tables:");
  spawnSync("psql", ["-h", "localhost", "-p", "15432", "-U", "root", "-d", "invoices_db", "-c", "\\dt"], { cwd: scriptDir, stdio: "inherit", env: { ...process.env, PGPASSWORD: "root" } });
  process.exit(0);
}

r = spawnSync("psql", ["-d", "invoices_db", "-f", sqlPath], { cwd: scriptDir, stdio: "inherit" });
if (r.status === 0) {
  console.log("✅ Tables created successfully!");
  console.log("🔍 Verifying created tables:");
  spawnSync("psql", ["-d", "invoices_db", "-c", "\\dt"], { cwd: scriptDir, stdio: "inherit" });
  process.exit(0);
}

help();
