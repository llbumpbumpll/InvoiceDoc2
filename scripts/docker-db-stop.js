#!/usr/bin/env node
"use strict";
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const composeDb = path.join(root, "database", "compose.yaml");

console.log("🛑 Stopping InvoiceDoc2 Database...");
execSync(`docker-compose -f "${composeDb}" down`, { cwd: root, stdio: "inherit", shell: isWin });
console.log("✅ Database stopped!");
