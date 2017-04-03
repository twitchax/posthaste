"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const promisify = require("es6-promisify");
const dir = require("node-dir");
const adal = require("adal-node");
const Azure = require("ms-rest-azure");
const WebSiteManagementClient = require("azure-arm-website");
const AzureRm = require("azure-arm-resource");
const Kudu = require("kudu-api");
const settings = require("./settings");
// Global variables.
exports.cachePath = path.join(os.homedir(), '.posthaste');
exports.credentialPath = `${exports.cachePath}/credentials.json`;
exports.defaultResourceGroupName = 'PostHasteGroup';
exports.defaultLocation = 'westus2';
exports.defaultPlanName = 'PostHastePlan';
exports.defaultSku = { name: 'F1', tier: 'Free' };
var credentials;
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
    var kuduCredentials = await getWebsiteCredentials(name);
    var client = Kudu({
        website: name,
        username: kuduCredentials.publishingUserName,
        password: kuduCredentials.publishingPassword
    });
    try {
        var nodePackagePath = path.resolve(deployPath, 'package.json');
        var gitignorePath = path.resolve(deployPath, '.gitignore');
        var isNodeDeployment = false;
        if (fs.existsSync(nodePackagePath)) {
            isNodeDeployment = true;
        }
        // TODO: Ignore files in ".gitignore".
        console.log(`Uploading ... `.cyan);
        var files = await promisify(dir.files)(deployPath);
        await Promise.all(_(files).filter(f => !f.includes('.git')).map(async (file) => {
            var relativePath = path.relative(deployPath, file);
            console.log(`   ${relativePath}`.cyan);
            await promisify(client.vfs.uploadFile, client.vfs)(file, `site/wwwroot/${relativePath}`);
        }).value());
        console.log('done!'.green);
        if (isNodeDeployment) {
            // TODO: If this is a node app, generate the Web.config.
            console.log('Performing `npm install` ... '.cyan);
            var installResult = await promisify(client.command.exec, client.command)('npm install', 'site/wwwroot');
            console.log('done!'.green);
        }
    }
    catch (err) {
        console.log(err);
    }
}
exports.deployToWebsite = deployToWebsite;
// Helpers.
async function fixedKnownError(errCode) {
    var fixed = false;
    switch (errCode) {
        case 'ExpiredAuthenticationToken':
            await login(true);
            fixed = true;
            break;
        case 'InvalidAuthenticationTokenTenant':
            await createCredentials({ domain: _(await getTenants()).first().tenantId });
            fixed = true;
            break;
    }
    return fixed;
}
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
// Resolve methods.
async function resolveSubscriptionId() {
    await login();
    var subscriptionId = settings.get('subscriptionId');
    if (!subscriptionId) {
        console.log('No default subscription selected: ');
        _(await getSubscriptions()).forEach(s => {
            console.log(`   ${s.displayName}`);
        });
        console.log('Set subscription with `subscription set`.'.red);
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
        console.log(`Creating resource group: ${rgName} ... `.cyan);
        await createResourceGroup(rgName);
        console.log('done!'.green);
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
        console.log(`Creating app service plan: ${planName} ... `.cyan);
        await createPlan(planName);
        console.log('done!'.green);
    }
    return planName;
}
exports.resolvePlanName = resolvePlanName;
//# sourceMappingURL=helpers.js.map