import * as request from 'request';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as async from 'async';
import * as ProgressBar from 'progress';
import * as mkdirp from 'mkdirp';
import * as colors from 'colors'; colors;
import * as randomstring from 'randomstring';
import * as ncp from 'copy-paste';
import * as path from 'path';
import * as readline from 'readline';
import * as promisify from 'es6-promisify';

import * as settings from '../shared/settings';
import * as helpers from '../shared/helpers';
import {  } from '../shared/bll';

// Globals.

// Tenant commands.

export async function listTenants() {
    var tenants = await helpers.getTenants();
    
    console.log(`${helpers._tab}Tenants:`);
    helpers.tab();
    _(tenants).forEach(t => console.log(`${helpers._tab}${t.tenantId}`.cyan));
    helpers.untab();
}

// Subscription commands.

export async function setSubscription(name: string) {
    var subscriptions = await helpers.getSubscriptions();

    var subscription = _(subscriptions).filter(s => s.displayName === name).first();

    if(!subscription) {
        console.log(`${helpers._tab}Cannot find subscription: ${name}`.red);
        return;
    }

    settings.set('subscriptionId', subscription.subscriptionId);

    console.log(`${helpers._tab}Successfully set default subscription: ${subscription.displayName} (${subscription.subscriptionId}).`.green);
}

export async function listSubscriptions() {
    var subscriptions = await helpers.getSubscriptions();
    
    console.log(`${helpers._tab}Subscriptions:`);
    helpers.tab();
    _(subscriptions).forEach(s => console.log(`${helpers._tab}${s.displayName}`.cyan));
    helpers.untab();
}

// Resource group commands.

export async function setResourceGroup(name: string) {
    settings.set('resourceGroupName', name);
    console.log(`${helpers._tab}Successfully set default resource group: ${name}.`.green);
}

export async function listResourceGroups() {
    var groups = await helpers.getResourceGroups();
    
    console.log(`${helpers._tab}Resource groups:`);
    helpers.tab();
    _(groups).forEach(g => console.log(`${helpers._tab}${g.name}`.cyan));
    helpers.untab();
}

// Plan commands.

export async function setPlan(name: string) {
    settings.set('resourceGroupName', name);
    console.log(`${helpers._tab}Successfully set default plan: ${name}.`.green);
}

export async function listPlans() {
    var plans = await helpers.getPlans();
    
    console.log(`${helpers._tab}Plans:`);
    helpers.tab();
    _(plans).forEach(p => console.log(`${helpers._tab}${p.name}`.cyan));
    helpers.untab();
}

// Website commands.

export async function listWebsites() {
    var sites = await helpers.getWebsites();
    
    console.log(`${helpers._tab}Sites:`);
    helpers.tab();
    _(sites).forEach(s => console.log(`${helpers._tab}${s.name}`.cyan));
    helpers.untab();
}

export async function removeWebsites(name: string) {
    if(!name) {
        var sites = await helpers.getWebsites();
    } else {
        var sites = _(await helpers.getWebsites()).filter(s => s.name.startsWith(name)).value();
    }
    
    console.log(`${helpers._tab}Preparing to remove:`);
    helpers.tab();
    _(sites).orderBy(s => s.name).forEach(s => console.log(`${helpers._tab}${s.name}`));
    helpers.untab();

    var i = readline.createInterface(process.stdin, process.stdout, null);
    i.question(`${helpers._tab}Are you sure you want to remove these websites (Y/[n])? `.yellow, async result => {
        i.close(); (process.stdin as any).destroy();

        if(result !== 'Y') {
            console.log(`${helpers._tab}No action taken.`.green);
            return;
        }

        console.log(`${helpers._tab}Removing sites ... `.cyan);
        for(let s of sites) {
            await helpers.deleteWebsite(s.name);
        }
        console.log(`${helpers._tab}Sites removed.`.green);
    });
}

// Deploy commands.

export async function deploy(deployPath: string = '.', deployName: string = undefined) {

    var fullPath = path.resolve(deployPath);

    if(!fs.existsSync(fullPath)) {
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

    console.log(`${helpers._tab}Creating site: http://${websiteName}.azurewebsites.net/ ... `.cyan);
    helpers.tab();
    var site = await helpers.createWebsite(websiteName);
    helpers.untab();

    console.log(`${helpers._tab}Deploying ... `.cyan);
    helpers.tab();
    await helpers.deployToWebsite(websiteName, fullPath);
    helpers.untab();

    console.log(`${helpers._tab}Navigate to http://${websiteName}.azurewebsites.net/ ! `.cyan);
}

// Other commands.

export function clearCredentials() {
    fs.unlinkSync(helpers.credentialPath);
}

export function clearSettings() {
    fs.unlinkSync(settings.settingsPath);
}