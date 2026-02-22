#!/usr/bin/env node
"use strict";
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const service = process.argv[2] || "";

const cmd = service ? `docker-compose logs -f ${service}` : "docker-compose logs -f";
execSync(cmd, { cwd: root, stdio: "inherit", shell: isWin });
