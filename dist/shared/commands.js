"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const colors = require("colors");
colors;
const randomstring = require("randomstring");
const path = require("path");
const readline = require("readline");
const settings = require("../shared/settings");
const helpers = require("../shared/helpers");
// Globals.
// Tenant commands.
async function listTenants() {
    var tenants = await helpers.getTenants();
    console.log('Tenants:');
    _(tenants).forEach(t => console.log(`   ${t.tenantId}`.cyan));
}
exports.listTenants = listTenants;
// Subscription commands.
async function setSubscription(name) {
    var subscriptions = await helpers.getSubscriptions();
    var subscription = _(subscriptions).filter(s => s.displayName === name).first();
    if (!subscription) {
        console.log(`Cannot find subscription: ${name}`.red);
        return;
    }
    settings.set('subscriptionId', subscription.subscriptionId);
    console.log(`Successfully set default subscription: ${subscription.displayName} (${subscription.subscriptionId}).`.green);
}
exports.setSubscription = setSubscription;
async function listSubscriptions() {
    var subscriptions = await helpers.getSubscriptions();
    console.log('Subscriptions:');
    _(subscriptions).forEach(s => console.log(`   ${s.displayName}`.cyan));
}
exports.listSubscriptions = listSubscriptions;
// Resource group commands.
async function setResourceGroup(name) {
    settings.set('resourceGroupName', name);
    console.log(`Successfully set default resource group: ${name}.`.green);
}
exports.setResourceGroup = setResourceGroup;
async function listResourceGroups() {
    var groups = await helpers.getResourceGroups();
    console.log('Resource groups:');
    _(groups).forEach(g => console.log(`   ${g.name}`.cyan));
}
exports.listResourceGroups = listResourceGroups;
// Plan commands.
async function setPlan(name) {
    settings.set('resourceGroupName', name);
    console.log(`Successfully set default plan: ${name}.`.green);
}
exports.setPlan = setPlan;
async function listPlans() {
    var plans = await helpers.getPlans();
    console.log('Plans:');
    _(plans).forEach(p => console.log(`   ${p.name}`.cyan));
}
exports.listPlans = listPlans;
// Website commands.
async function listWebsites() {
    var sites = await helpers.getWebsites();
    console.log('Sites:');
    _(sites).forEach(s => console.log(`   ${s.name}`.cyan));
}
exports.listWebsites = listWebsites;
async function removeWebsites(name) {
    if (!name) {
        var sites = await helpers.getWebsites();
    }
    else {
        var sites = _(await helpers.getWebsites()).filter(s => s.name.startsWith(name)).value();
    }
    console.log('Preparing to remove:');
    _(sites).orderBy(s => s.name).forEach(s => console.log(`   ${s.name}`));
    var i = readline.createInterface(process.stdin, process.stdout, null);
    i.question('Are you sure you want to remove these websites (Y/[n])? '.yellow, async (result) => {
        i.close();
        process.stdin.destroy();
        if (result !== 'Y') {
            console.log('No action taken.'.green);
            return;
        }
        console.log(`Removing sites ... `.cyan);
        for (var s of sites) {
            await helpers.deleteWebsite(s.name);
        }
        console.log('Sites removed.'.green);
    });
}
exports.removeWebsites = removeWebsites;
// Deploy commands.
async function deploy(deployPath = '.') {
    var fullPath = path.resolve(deployPath);
    if (!fs.existsSync(fullPath)) {
        console.log('Invalid path specified.'.red);
        return;
    }
    var projName = _(fullPath.split(new RegExp('[/\\\\]'))).last();
    var random = randomstring.generate({
        length: 8,
        charset: 'alphabetic',
        capitalization: 'lowercase'
    });
    var websiteName = `${projName}-${random}`;
    console.log(`Creating site: http://${websiteName}.azurewebsites.net/ ... `.cyan);
    var site = await helpers.createWebsite(websiteName);
    console.log('done!'.green);
    console.log(`Deploying ... `.cyan);
    await helpers.deployToWebsite(websiteName, fullPath);
    console.log('done!'.green);
    console.log(`Navigate to http://${websiteName}.azurewebsites.net/ ! `.cyan);
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