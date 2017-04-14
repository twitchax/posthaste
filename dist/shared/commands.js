"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const colors = require("colors");
colors;
const randomstring = require("randomstring");
const ncp = require("copy-paste");
const path = require("path");
const readline = require("readline");
const settings = require("../shared/settings");
const helpers = require("../shared/helpers");
// Globals.
// Tenant commands.
async function listTenants() {
    var tenants = await helpers.getTenants();
    console.log(`${helpers._tab}Tenants:`);
    helpers.tab();
    _(tenants).forEach(t => console.log(`${helpers._tab}${t.tenantId}`.cyan));
    helpers.untab();
}
exports.listTenants = listTenants;
// Subscription commands.
async function setSubscription(name) {
    var subscriptions = await helpers.getSubscriptions();
    var subscription = _(subscriptions).filter(s => s.displayName === name).first();
    if (!subscription) {
        console.log(`${helpers._tab}Cannot find subscription: ${name}`.red);
        return;
    }
    settings.set('subscriptionId', subscription.subscriptionId);
    console.log(`${helpers._tab}Successfully set default subscription: ${subscription.displayName} (${subscription.subscriptionId}).`.green);
}
exports.setSubscription = setSubscription;
async function listSubscriptions() {
    var subscriptions = await helpers.getSubscriptions();
    console.log(`${helpers._tab}Subscriptions:`);
    helpers.tab();
    _(subscriptions).forEach(s => console.log(`${helpers._tab}${s.displayName}`.cyan));
    helpers.untab();
}
exports.listSubscriptions = listSubscriptions;
// Resource group commands.
async function setResourceGroup(name) {
    settings.set('resourceGroupName', name);
    console.log(`${helpers._tab}Successfully set default resource group: ${name}.`.green);
}
exports.setResourceGroup = setResourceGroup;
async function listResourceGroups() {
    var groups = await helpers.getResourceGroups();
    console.log(`${helpers._tab}Resource groups:`);
    helpers.tab();
    _(groups).forEach(g => console.log(`${helpers._tab}${g.name}`.cyan));
    helpers.untab();
}
exports.listResourceGroups = listResourceGroups;
// Plan commands.
async function setPlan(name) {
    settings.set('resourceGroupName', name);
    console.log(`${helpers._tab}Successfully set default plan: ${name}.`.green);
}
exports.setPlan = setPlan;
async function listPlans() {
    var plans = await helpers.getPlans();
    console.log(`${helpers._tab}Plans:`);
    helpers.tab();
    _(plans).forEach(p => console.log(`${helpers._tab}${p.name}`.cyan));
    helpers.untab();
}
exports.listPlans = listPlans;
// Website commands.
async function listWebsites() {
    var sites = await helpers.getWebsites();
    console.log(`${helpers._tab}Sites:`);
    helpers.tab();
    _(sites).forEach(s => console.log(`${helpers._tab}${s.name}`.cyan));
    helpers.untab();
}
exports.listWebsites = listWebsites;
async function removeWebsites(name) {
    if (!name) {
        var sites = await helpers.getWebsites();
    }
    else {
        var sites = _(await helpers.getWebsites()).filter(s => s.name.startsWith(name)).value();
    }
    console.log(`${helpers._tab}Preparing to remove:`);
    helpers.tab();
    _(sites).orderBy(s => s.name).forEach(s => console.log(`${helpers._tab}${s.name}`));
    helpers.untab();
    var i = readline.createInterface(process.stdin, process.stdout, null);
    i.question(`${helpers._tab}Are you sure you want to remove these websites (Y/[n])? `.yellow, async (result) => {
        i.close();
        process.stdin.destroy();
        if (result !== 'Y') {
            console.log(`${helpers._tab}No action taken.`.green);
            return;
        }
        console.log(`${helpers._tab}Removing sites ... `.cyan);
        for (let s of sites) {
            await helpers.deleteWebsite(s.name);
        }
        console.log(`${helpers._tab}Sites removed.`.green);
    });
}
exports.removeWebsites = removeWebsites;
// Deploy commands.
async function deploy(deployPath = '.', deployName = undefined) {
    var fullPath = path.resolve(deployPath);
    if (!fs.existsSync(fullPath)) {
        console.log(`${helpers._tab}Invalid path specified.`.red);
        return;
    }
    // TODO: Infer name from pachage.json/csproj?
    var projName = deployName || _(fullPath.split(new RegExp('[/\\\\]'))).last();
    var random = randomstring.generate({
        length: 8,
        charset: 'alphabetic',
        capitalization: 'lowercase'
    });
    var websiteName = `${projName}-${random}`;
    var websiteUri = `http://${websiteName}.azurewebsites.net/`;
    console.log(`${helpers._tab}Creating site: ${websiteUri} ... `.cyan);
    helpers.tab();
    var site = await helpers.createWebsite(websiteName);
    helpers.untab();
    console.log(`${helpers._tab}Deploying ... `.cyan);
    helpers.tab();
    await helpers.deployToWebsite(websiteName, fullPath);
    helpers.untab();
    ncp.copy(websiteUri);
    console.log(`${helpers._tab}Navigate to ${websiteUri} ! `.cyan);
}
exports.deploy = deploy;
// Other commands.
function clearCredentials() {
    fs.unlinkSync(helpers.credentialPath);
}
exports.clearCredentials = clearCredentials;
function clearSettings() {
    fs.unlinkSync(settings.settingsPath);
}
exports.clearSettings = clearSettings;
//# sourceMappingURL=commands.js.map