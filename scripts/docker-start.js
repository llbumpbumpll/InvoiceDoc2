#!/usr/bin/env node
"use strict";
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const run = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: "inherit", shell: isWin, ...opts });

console.log("🚀 Starting InvoiceDoc2 services...");
try {
  run("docker info", { stdio: "pipe" });
} catch {
  console.error("❌ Docker is not running. Please start Docker Desktop first.");
  process.exit(1);
}
console.log("📦 Building and starting containers...");
run("docker-compose up -d --build");
console.log("⏳ Waiting for services to be ready...");
if (isWin) run("timeout /t 5 /nobreak > nul", { shell: true });
else run("sleep 5");
console.log("\n📊 Service Status:");
run("docker-compose ps");
console.log("\n✅ Services started!");
console.log("📍 Access: Client http://localhost:3000 | Server http://localhost:4000 | Adminer http://localhost:8080");
