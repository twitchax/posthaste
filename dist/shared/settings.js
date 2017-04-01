"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const fs = require("fs");
// Global variables.
exports.cachePath = path.join(os.homedir(), '.posthaste');
exports.settingsPath = `${exports.cachePath}/settings.json`;
var settings;
function get(key) {
    ensureFile();
    return settings[key];
}
exports.get = get;
function set(key, value) {
    ensureFile();
    settings[key] = value;
    fs.writeFileSync(exports.settingsPath, JSON.stringify(settings, null, 2));
}
exports.set = set;
function ensureFile() {
    if (!settings) {
        if (!fs.existsSync(exports.settingsPath)) {
            fs.writeFileSync(exports.settingsPath, '{}');
        }
        settings = JSON.parse(fs.readFileSync(exports.settingsPath).toString());
    }
}
//# sourceMappingURL=settings.js.map