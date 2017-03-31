#! /usr/bin/env node

import * as os from 'os';
import * as program from 'commander';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import * as colors from 'colors'; colors;
var pkginfo = require('pkginfo')(module);

import * as commands from '../shared/commands';
import * as helpers from '../shared/helpers';

// Variables.

var runDefault = true;
var passthroughPath = '.';

// Setup.

mkdirp.sync(helpers.cachePath);
console.log(`Caching data to ${helpers.cachePath}.`.blue);

// Global defines.

program
    .version(module.exports.version);

// Login commands.

program
    .command('login')
    .description('login to Azure and cache credentials for later use.')
    .action(async () => {
        runDefault = false;

        await helpers.login(true /* ignoreCache */);
    });

// Tenant commands.

program
    .command('tenant')
    .arguments('<cmd> [arg]')
    .description('edit tenants (list, set).')
    .action(async (cmd, arg) => {
        runDefault = false;
        
        switch(cmd) {
            case 'list':
                await commands.listTenants();
                break;
        }
    });

// Subscription commands.

program
    .command('subscription')
    .alias('sub')
    .arguments('<cmd> [arg]')
    .description('edit subscriptions (list, set).')
    .action(async (cmd, arg) => {
        runDefault = false;
        
        switch(cmd) {
            case 'set':
                await commands.setSubscription(arg);
                break;
            case 'list':
                await commands.listSubscriptions();
                break;
        }
    });

// Resource group commands.

program
    .command('resourceGroup')
    .alias('rg')
    .arguments('<cmd> [arg]')
    .description('edit resource groups (list, set)')
    .action(async (cmd, arg) => {
        runDefault = false;

        switch(cmd) {
            case 'set':
                await commands.setResourceGroup(arg);
                break;
            case 'list':
                await commands.listResourceGroups();
                break;
        }
    });

// Plan commands.

program
    .command('plan')
    .arguments('<cmd> [arg]')
    .description('edit resource groups (list, set)')
    .action(async (cmd, arg) => {
        runDefault = false;

        switch(cmd) {
            case 'set':
                await commands.setPlan(arg);
                break;
            case 'list':
                await commands.listPlans();
                break;
        }
    });

// Other commands.

program
    .command('credential')
    .alias('cred')
    .arguments('<cmd> [arg]')
    .description('edit credentials (clear)')
    .action(async (cmd, arg) => {
        runDefault = false;

        switch(cmd) {
            case 'delete':
            case 'clear':
                commands.clearCredentials();
                break;
        }
    });

program
    .command('setting')
    .arguments('<cmd> [arg]')
    .description('edit settings (clear)')
    .action(async (cmd, arg) => {
        runDefault = false;

        switch(cmd) {
            case 'delete':
            case 'clear':
                commands.clearSettings();
                break;
        }
    });

// Website commands.

program
    .command('list')
    .alias('ls')
    .description('list all sites.')
    .action(async () => {
        runDefault = false;

        await commands.listWebsites();
    });

program
    .command('remove')
    .alias('rm')
    .arguments('[likeName]')
    .description('delete all sites that begin with [likeName].')
    .action(async (likeName) => {
        runDefault = false;

        await commands.removeWebsites(likeName);
    });

// Deploy commands.

program
    .option('-p, --path <path>', 'deploys a site from <path>.')
    .action((path) => {
        passthroughPath = path;
    });

// Global directives.

program.parse(process.argv);

// Main path.

if(passthroughPath !== '.' && !program.path) {
    console.log('Unrecognized control argument.'.red);
    process.exit();
}

if(runDefault)
    commands.deploy(passthroughPath);