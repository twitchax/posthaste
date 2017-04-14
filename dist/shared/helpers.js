"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const _ = require("lodash");
const colors = require("colors");
colors;
const promisify = require("es6-promisify");
const child_process_promise_1 = require("child-process-promise");
const adal = require("adal-node");
const Azure = require("ms-rest-azure");
const WebSiteManagementClient = require("azure-arm-website");
const AzureRm = require("azure-arm-resource");
const settings = require("./settings");
// Global variables.
exports.cachePath = path.join(os.homedir(), '.posthaste');
exports.credentialPath = `${exports.cachePath}/credentials.json`;
exports.defaultResourceGroupName = 'PostHasteGroup';
exports.defaultLocation = 'westus2';
exports.defaultPlanName = 'PostHastePlan';
exports.defaultSku = { name: 'F1', tier: 'Free' };
exports.stagingDirectoryName = '_phStaging';
exports.gitRemoteName = 'postHaste';
exports._tab = '';
var credentials;
// Tenant helpers.
async function getTenants() {
    await login();
    var client = new AzureRm.SubscriptionClient(credentials);
    try {
        return await promisify(client.tenants.list, client.tenants)();
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await getTenants();
        throw err;
    }
}
exports.getTenants = getTenants;
async function getSubscriptions() {
    await login();
    var client = new AzureRm.SubscriptionClient(credentials);
    try {
        var subscriptions = await promisify(client.subscriptions.list, client.subscriptions)();
        if (subscriptions.length === 0 && await fixedKnownError('InvalidAuthenticationTokenTenant'))
            return await getSubscriptions();
        return subscriptions;
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await getSubscriptions();
        throw err;
    }
}
exports.getSubscriptions = getSubscriptions;
// Resource group helpers.
async function getResourceGroups() {
    var subscriptionId = await resolveSubscriptionId();
    var client = new AzureRm.ResourceManagementClient(credentials, subscriptionId);
    try {
        return await promisify(client.resourceGroups.list, client.resourceGroups)({} /* options */);
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await getResourceGroups();
        throw err;
    }
}
exports.getResourceGroups = getResourceGroups;
async function createResourceGroup(name) {
    var subscriptionId = await resolveSubscriptionId();
    var client = new AzureRm.ResourceManagementClient(credentials, subscriptionId);
    try {
        return await promisify(client.resourceGroups.createOrUpdate, client.resourceGroups)(name, { location: exports.defaultLocation });
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await createResourceGroup(name);
        throw err;
    }
}
exports.createResourceGroup = createResourceGroup;
// Plan helpers.
async function getPlans() {
    var subscriptionId = await resolveSubscriptionId();
    var client = new WebSiteManagementClient(credentials, subscriptionId);
    try {
        return await promisify(client.serverFarms.getServerFarms, client.serverFarms)(await resolveGroupName(), {} /* options */);
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await getPlans();
        throw err;
    }
}
exports.getPlans = getPlans;
async function createPlan(name) {
    var subscriptionId = await resolveSubscriptionId();
    var client = new WebSiteManagementClient(credentials, subscriptionId);
    client.serverFarms;
    try {
        return await promisify(client.serverFarms.createOrUpdateServerFarm, client.serverFarms)(await resolveGroupName(), name, { location: exports.defaultLocation, sku: exports.defaultSku });
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await createPlan(name);
        throw err;
    }
}
exports.createPlan = createPlan;
// Website helpers.
async function getWebsites() {
    var subscriptionId = await resolveSubscriptionId();
    var client = new WebSiteManagementClient(credentials, subscriptionId);
    try {
        return await promisify(client.sites.getSites, client.sites)(await resolveGroupName());
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await getWebsites();
        throw err;
    }
}
exports.getWebsites = getWebsites;
async function createWebsite(name) {
    var subscriptionId = await resolveSubscriptionId();
    var client = new WebSiteManagementClient(credentials, subscriptionId);
    try {
        return await promisify(client.sites.createOrUpdateSite, client.sites)(await resolveGroupName(), name, { location: exports.defaultLocation, serverFarmId: await resolvePlanName() } /* siteEnvelope */, {} /* options */);
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await createWebsite(name);
        throw err;
    }
}
exports.createWebsite = createWebsite;
async function getWebsiteCredentials(name) {
    var subscriptionId = await resolveSubscriptionId();
    var client = new WebSiteManagementClient(credentials, subscriptionId);
    try {
        return await promisify(client.sites.listSitePublishingCredentials, client.sites)(await resolveGroupName(), name);
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await getWebsiteCredentials(name);
        throw err;
    }
}
exports.getWebsiteCredentials = getWebsiteCredentials;
async function deleteWebsite(name) {
    var subscriptionId = await resolveSubscriptionId();
    var client = new WebSiteManagementClient(credentials, subscriptionId);
    try {
        return await promisify(client.sites.deleteSite, client.sites)(await resolveGroupName(), name, {} /* options */);
    }
    catch (err) {
        if (await fixedKnownError(err.code))
            return await deleteWebsite(name);
        throw err;
    }
}
exports.deleteWebsite = deleteWebsite;
async function deployToWebsite(name, deployPath) {
    try {
        var kuduCredentials = await getWebsiteCredentials(name);
        var gitEndpoint = kuduCredentials.scmUri;
        var stagingDirectory = path.resolve(exports.cachePath, `${exports.stagingDirectoryName}_${name}`);
        console.log(`${exports._tab}Preparing staging directory ... `.cyan);
        fsExtra.removeSync(stagingDirectory);
        fsExtra.mkdirpSync(stagingDirectory);
        fsExtra.copySync(deployPath, stagingDirectory, { filter: ((s) => {
                return true;
            })
        });
        if (!fs.existsSync(path.resolve(stagingDirectory, '.git'))) {
            console.log(`${exports._tab}Initializing git repository ... `.cyan);
            await child_process_promise_1.exec('git init', { cwd: stagingDirectory });
            console.log(`${exports._tab}Adding changes to git repository ... `.cyan);
            await child_process_promise_1.exec('git add * -f', { cwd: stagingDirectory });
            console.log(`${exports._tab}Committing changes ...`.cyan);
            await child_process_promise_1.exec('git commit -m "PostHaste commit pre-deploy."', { cwd: stagingDirectory });
        }
        console.log(`${exports._tab}Setting remote ...`.cyan);
        await child_process_promise_1.exec(`git remote rm ${exports.gitRemoteName}`, { cwd: stagingDirectory }).catch(() => { });
        if (os.platform().toLowerCase().includes('linux') || os.platform().toLowerCase().includes('darwin')) {
            await child_process_promise_1.exec(`git remote add ${exports.gitRemoteName} '${gitEndpoint}'`, { cwd: stagingDirectory });
        }
        else {
            await child_process_promise_1.exec(`git remote add ${exports.gitRemoteName} ${gitEndpoint}`, { cwd: stagingDirectory });
        }
        console.log(`${exports._tab}Pushing via git ...`.cyan);
        var pushChild = child_process_promise_1.exec(`git push ${exports.gitRemoteName} master`, { cwd: stagingDirectory });
        pushChild.childProcess.stderr.on('data', (chunk) => {
            process.stdout.write(chunk);
        });
        await pushChild;
    }
    catch (err) {
        console.log(`${exports._tab}${JSON.stringify(err, null, 2)}`.red);
    }
    finally {
        console.log(`${exports._tab}Cleaning up staging directory ...`.cyan);
        fsExtra.removeSync(stagingDirectory);
    }
}
exports.deployToWebsite = deployToWebsite;
// Login helpers.
async function login(ignoreCache = false, tenantId) {
    if (!ignoreCache && credentials)
        return credentials;
    if (!ignoreCache && fs.existsSync(exports.credentialPath)) {
        var c = JSON.parse(fs.readFileSync(exports.credentialPath).toString());
        c.tokenCache = Object.assign(new adal.MemoryCache(), c.tokenCache);
        credentials = new Azure.DeviceTokenCredentials(c);
        return credentials;
    }
    credentials = await promisify(Azure.interactiveLogin)({ domain: tenantId });
    fs.writeFileSync(exports.credentialPath, JSON.stringify(credentials));
    return credentials;
}
exports.login = login;
// Other helpers.
async function fixedKnownError(errCode) {
    var fixed = false;
    switch (errCode) {
        case 'ExpiredAuthenticationToken':
            console.log(`${exports._tab}Refreshing access token ... `.yellow);
            await refreshLogin();
            fixed = true;
            break;
        case 'InvalidAuthenticationTokenTenant':
            console.log(`${exports._tab}Converting access token to first tenant ... `.yellow);
            await createCredentials({ domain: _(await getTenants()).first().tenantId });
            fixed = true;
            break;
    }
    return fixed;
}
async function refreshLogin() {
    for (var entry of credentials.tokenCache._entries) {
        var adalClient = new adal.AuthenticationContext(`https://login.microsoftonline.com/${entry.tenantId}`);
        var tokenResponse = await promisify(adalClient.acquireTokenWithRefreshToken, adalClient)(entry.refreshToken, entry._clientId, null);
        entry = Object.assign(entry, tokenResponse);
    }
    fs.writeFileSync(exports.credentialPath, JSON.stringify(credentials));
}
exports.refreshLogin = refreshLogin;
function createCredentials(parameters) {
    var options = {};
    var creds = credentials;
    options.environment = creds.environment;
    options.domain = 'common';
    options.clientId = creds.clientId;
    options.tokenCache = creds.tokenCache;
    options.username = creds.username;
    options.authorizationScheme = creds.authorizationScheme;
    options.tokenAudience = creds.tokenAudience;
    if (parameters) {
        if (parameters.domain) {
            options.domain = parameters.domain;
        }
        if (parameters.environment) {
            options.environment = parameters.environment;
        }
        if (parameters.userId) {
            options.username = parameters.userId;
        }
        if (parameters.tokenCache) {
            options.tokenCache = parameters.tokenCache;
        }
        if (parameters.tokenAudience) {
            options.tokenAudience = parameters.tokenAudience;
        }
    }
    if (Azure.UserTokenCredentials.prototype.isPrototypeOf(this)) {
        credentials = new Azure.UserTokenCredentials(options.clientId, options.domain, options.username, this.password, options);
    }
    else if (Azure.ApplicationTokenCredentials.prototype.isPrototypeOf(this)) {
        credentials = new Azure.ApplicationTokenCredentials(options.clientId, options.domain, this.secret, options);
    }
    else {
        credentials = new Azure.DeviceTokenCredentials(options);
    }
    fs.writeFileSync(exports.credentialPath, JSON.stringify(credentials));
    return credentials;
}
function tab() {
    exports._tab += '  ';
}
exports.tab = tab;
function untab() {
    exports._tab = exports._tab.substr(0, exports._tab.length - 2);
}
exports.untab = untab;
// Resolve methods.
async function resolveSubscriptionId() {
    await login();
    var subscriptionId = settings.get('subscriptionId');
    if (!subscriptionId) {
        console.log(`${exports._tab}No default subscription selected: `);
        tab();
        _(await getSubscriptions()).forEach(s => {
            console.log(`${exports._tab}${s.displayName}`);
        });
        untab();
        console.log(`${exports._tab}Set subscription with \`subscription set <subscriptionName>\`.`.red);
        throw new Error('No default subscription selected.');
    }
    return subscriptionId;
}
exports.resolveSubscriptionId = resolveSubscriptionId;
async function resolveGroupName() {
    var groups = await getResourceGroups();
    var rgName = settings.get('resourceGroupName');
    if (!rgName) {
        rgName = exports.defaultResourceGroupName;
        settings.set('resourceGroupName', exports.defaultResourceGroupName);
    }
    if (!_(groups).some(g => g.name === rgName)) {
        console.log(`${exports._tab}Creating resource group: ${rgName} ... `.cyan);
        tab();
        await createResourceGroup(rgName);
        untab();
    }
    return rgName;
}
exports.resolveGroupName = resolveGroupName;
async function resolvePlanName() {
    var plans = await getPlans();
    var planName = settings.get('planName');
    if (!planName) {
        planName = exports.defaultPlanName;
        settings.set('planName', exports.defaultPlanName);
    }
    if (!_(plans).some(p => p.name === planName)) {
        console.log(`${exports._tab}Creating app service plan: ${planName} ... `.cyan);
        tab();
        await createPlan(planName);
        untab();
    }
    return planName;
}
exports.resolvePlanName = resolvePlanName;
//# sourceMappingURL=helpers.js.map