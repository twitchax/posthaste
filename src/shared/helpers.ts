
import * as os from 'os';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as colors from 'colors';
import * as promisify from 'es6-promisify';

import * as adal from 'adal-node';
import * as Azure from 'ms-rest-azure';
import * as WebSiteManagementClient from 'azure-arm-website';
import * as AzureRm from 'azure-arm-resource';

import * as settings from './settings';
import { Tenant, Subscription, ResourceGroup, Plan, Website } from './bll';

// Global variables.

export const cachePath = path.join(os.homedir(), '.posthaste');
export const credentialPath = `${cachePath}/credentials.json`;
export const defaultResourceGroupName = 'PostHasteGroup';
export const defaultLocation = 'westus2';
export const defaultPlanName = 'PostHastePlan';
export const defaultSku = { name: 'F1', tier: 'Free' };

var credentials: Azure.DeviceTokenCredentials;

// Login helpers.

export async function login(ignoreCache: boolean = false, tenantId?: string) {
    if(!ignoreCache && credentials)
        return credentials;

    if(!ignoreCache && fs.existsSync(credentialPath)) {
        var c = JSON.parse(fs.readFileSync(credentialPath).toString());
        c.tokenCache = Object.assign(new adal.MemoryCache(), c.tokenCache);
        credentials = new Azure.DeviceTokenCredentials(c);
        
        return credentials;
    }

    credentials = await promisify(Azure.interactiveLogin)({ domain: tenantId });
    fs.writeFileSync(credentialPath, JSON.stringify(credentials));

    return credentials;
}

// Tenant helpers.

export async function getTenants() : Promise<Tenant[]> {
    await login();
    
    var client = new AzureRm.SubscriptionClient(credentials);
    
    try {
        return await promisify(client.tenants.list, client.tenants)();
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await getTenants();
        
        throw err;
    }
}

export async function getSubscriptions() : Promise<Subscription[]> {
    await login();
    
    var client = new AzureRm.SubscriptionClient(credentials);

    try {
        var subscriptions = await promisify(client.subscriptions.list, client.subscriptions)();

        if(subscriptions.length === 0 && await fixedKnownError('InvalidAuthenticationTokenTenant'))
            return await getSubscriptions();

        return subscriptions;
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await getSubscriptions();

        throw err;
    }
}

// Resource group helpers.

export async function getResourceGroups() : Promise<ResourceGroup[]> {
    var subscriptionId = await resolveSubscriptionId();

    var client = new AzureRm.ResourceManagementClient(credentials, subscriptionId);

    try {
        return await promisify(client.resourceGroups.list, client.resourceGroups)({} /* options */);
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await getResourceGroups();
        
        throw err;
    }
}

export async function createResourceGroup(name: string) : Promise<ResourceGroup> {
    var subscriptionId = await resolveSubscriptionId();

    var client = new AzureRm.ResourceManagementClient(credentials, subscriptionId);

    try {
        return await promisify(client.resourceGroups.createOrUpdate, client.resourceGroups)(name, { location: defaultLocation });
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await createResourceGroup(name);
        
        throw err;
    }
}

// Plan helpers.

export async function getPlans() : Promise<Plan[]> {
    var subscriptionId = await resolveSubscriptionId();
    
    var client = new WebSiteManagementClient(credentials, subscriptionId);

    try {
        return await promisify(client.serverFarms.getServerFarms, client.serverFarms)(await resolveGroupName(), {} /* options */);
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await getPlans();
        
        throw err;
    }
}

export async function createPlan(name: string) : Promise<Plan> {
    var subscriptionId = await resolveSubscriptionId();
    
    var client = new WebSiteManagementClient(credentials, subscriptionId);

    try {
        return await promisify(client.serverFarms.createOrUpdateServerFarm, client.serverFarms)(await resolveGroupName(), name, { location: defaultLocation, sku: defaultSku });
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await createPlan(name);
        
        throw err;
    }
}

// Website helpers.

export async function getWebsites() : Promise<Website[]> {
    var subscriptionId = await resolveSubscriptionId();
    
    var client = new WebSiteManagementClient(credentials, subscriptionId);

    try {
        return await promisify(client.sites.getSites, client.sites)(await resolveGroupName());
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await getWebsites();
        
        throw err;
    }
}

export async function createWebsite(name: string) : Promise<Website> {
    var subscriptionId = await resolveSubscriptionId();
    
    var client = new WebSiteManagementClient(credentials, subscriptionId);

    try {
        return await promisify(client.sites.createOrUpdateSite, client.sites)(await resolveGroupName(), name, { location: defaultLocation, serverFarmId: await resolvePlanName() } /* siteEnvelope */, {} /* options */);
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await createWebsite(name);
        
        throw err;
    }
}

export async function deleteWebsite(name: string) : Promise<Website> {
    var subscriptionId = await resolveSubscriptionId();
    
    var client = new WebSiteManagementClient(credentials, subscriptionId);

    try {
        return await promisify(client.sites.deleteSite, client.sites)(await resolveGroupName(), name, {} /* options */);
    } catch(err) {
        if(await fixedKnownError(err.code))
            return await deleteWebsite(name);
        
        throw err;
    }
}

// Helpers.

async function fixedKnownError(errCode) {
    var fixed = false;

    async function loginForTenant() {
        var tenantId = _(await getTenants()).first().tenantId;
        await login(true, tenantId);
    }

    switch(errCode) {
        case 'ExpiredAuthenticationToken':
            await login(true);
            fixed = true;
            break;
        case 'InvalidAuthenticationTokenTenant':
            await loginForTenant();
            // var authContext = new adal.AuthenticationContext(`https://login.microsoftonline.com/${tenantId}`, true, (credentials as any).tokenCache);
            // authContext.acquireTokenWithDeviceCode(authConfig.resourceId, authConfig.clientId, userCodeResponse, function (err, tokenResponse) {
            //     if (err) { return callback(err); }
            //     return callback(null, new exports.UserTokenCredentials(authConfig, tokenResponse.userId));
            // });
            fixed = true;
            break;
    }

    return fixed;
}

// Resolve methods.

export async function resolveSubscriptionId() : Promise<string> {
    await login();

    var subscriptionId = settings.get('subscriptionId');

    if(!subscriptionId) {
        console.log('No default subscription selected: ');
        _(await getSubscriptions()).forEach(s => {
            console.log(`   ${s.displayName}`);
        });
        console.log('Set subscription with `subscription set`.'.red);

        throw new Error('No default subscription selected.');
    }

    return subscriptionId;
}

export async function resolveGroupName() : Promise<string> {
    var groups = await getResourceGroups();

    var rgName = settings.get('resourceGroupName');
    if(!rgName) {
        rgName = defaultResourceGroupName;
        settings.set('resourceGroupName', defaultResourceGroupName);
    }
    
    if(!_(groups).some(g => g.name === rgName)) {
        console.log(`Creating resource group: ${rgName} ... `.cyan);
        await createResourceGroup(rgName);
        console.log('done!'.green);
    }

    return rgName;
}

export async function resolvePlanName() : Promise<string> {
    var plans = await getPlans();

    var planName = settings.get('planName');
    if(!planName) {
        planName = defaultPlanName;
        settings.set('planName', defaultPlanName);
    }
    
    if(!_(plans).some(p => p.name === planName)) {
        console.log(`Creating app service plan: ${planName} ... `.cyan);
        await createPlan(planName);
        console.log('done!'.green);
    }

    return planName;
}