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
    
    console.log('Tenants:')
    _(tenants).forEach(t => console.log(`   ${t.tenantId}`.cyan));
}

// Subscription commands.

export async function setSubscription(name: string) {
    var subscriptions = await helpers.getSubscriptions();

    var subscription = _(subscriptions).filter(s => s.displayName === name).first();

    if(!subscription) {
        console.log(`Cannot find subscription: ${name}`.red);
        return;
    }

    settings.set('subscriptionId', subscription.subscriptionId);

    console.log(`Successfully set default subscription: ${subscription.displayName} (${subscription.subscriptionId}).`.green);
}

export async function listSubscriptions() {
    var subscriptions = await helpers.getSubscriptions();
    
    console.log('Subscriptions:')
    _(subscriptions).forEach(s => console.log(`   ${s.displayName}`.cyan));
}

// Resource group commands.

export async function setResourceGroup(name: string) {
    settings.set('resourceGroupName', name);
    console.log(`Successfully set default resource group: ${name}.`.green);
}

export async function listResourceGroups() {
    var groups = await helpers.getResourceGroups();
    
    console.log('Resource groups:')
    _(groups).forEach(g => console.log(`   ${g.name}`.cyan));
}

// Plan commands.

export async function setPlan(name: string) {
    settings.set('resourceGroupName', name);
    console.log(`Successfully set default plan: ${name}.`.green);
}

export async function listPlans() {
    var plans = await helpers.getPlans();
    
    console.log('Plans:')
    _(plans).forEach(p => console.log(`   ${p.name}`.cyan));
}

// Website commands.

export async function listWebsites() {
    var sites = await helpers.getWebsites();
    
    console.log('Sites:')
    _(sites).forEach(s => console.log(`   ${s.name}`.cyan));
}

export async function removeWebsites(name) {
    var sites = _(await helpers.getWebsites()).filter(s => s.name.startsWith(name)).value();
    
    console.log('Preparing to remove:');
    _(sites).orderBy(s => s.name).forEach(s => console.log(`   ${s.name}`));

    var i = readline.createInterface(process.stdin, process.stdout, null);
    i.question('Are you sure you want to remove these websites (Y/[n])? '.yellow, async result => {
        i.close(); (process.stdin as any).destroy();

        if(result !== 'Y') {
            console.log('No action taken.'.green);
            return;
        }

        console.log(`Removing sites ... `.cyan);
        await Promise.all(_(sites).map(s => helpers.deleteWebsite(s.name)).value());
        console.log('Sites removed.'.green);
    });
}

// Deploy commands.

export async function deploy(deployPath: string = '.') {

    // TODO: Verify path exists.

    var projName = _(path.resolve(deployPath).split(new RegExp('[/\\\\]'))).last();
    var random = randomstring.generate({
        length: 8,
        charset: 'alphabetic', 
        capitalization: 'lowercase'
    });

    var websiteName = `${projName}-${random}`;

    console.log(`Creating site: http://${websiteName}.azurewebsites.net/ ... `.cyan);
    var site = await helpers.createWebsite(websiteName);
    console.log('done!'.green);

    // TODO: Deploy!
}

// Other commands.

export function clearCredentials() {
    fs.unlinkSync(helpers.credentialPath);
}

export function clearSettings() {
    fs.unlinkSync(settings.settingsPath);
}