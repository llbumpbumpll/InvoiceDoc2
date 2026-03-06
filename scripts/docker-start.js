#!/usr/bin/env node
"use strict";
const path = require("path");
const { execShell, isWin } = require("./run-safe.js");

const root = path.resolve(__dirname, "..");

console.log("🚀 Starting InvoiceDoc2 services...");
try {
  execShell("docker info", { cwd: root, stdio: "pipe" });
} catch {
  console.error("❌ Docker is not running. Please start Docker Desktop first.");
  process.exit(1);
}
console.log("📦 Building and starting containers...");
execShell("docker compose up -d --build", { cwd: root, stdio: "inherit" });
console.log("⏳ Waiting for services to be ready...");
if (isWin) execShell("timeout /t 5 /nobreak > nul", { cwd: root });
else execShell("sleep 5", { cwd: root });
console.log("\n📊 Service Status:");
execShell("docker compose ps", { cwd: root, stdio: "inherit" });
console.log("\n✅ Services started!");
console.log("📍 Access: Client http://localhost:3000 | Server http://localhost:4000 | Adminer http://localhost:8080");
