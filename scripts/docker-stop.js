#!/usr/bin/env node
"use strict";
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";

console.log("🛑 Stopping InvoiceDoc2 services...");
execSync("docker-compose down", { cwd: root, stdio: "inherit", shell: isWin });
console.log("✅ Services stopped!");
