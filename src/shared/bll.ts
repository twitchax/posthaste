import * as _ from 'lodash';
import * as colors from 'colors'; colors /* peg this for compile */;
import { Stats } from 'fast-stats';

import * as helpers from './helpers';

export interface SubscriptionPolicies {
    locationPlacementId: string;
    quotaId: string;
    spendingLimit: string;
}

export interface Subscription {
    id: string;
    subscriptionId: string;
    displayName: string;
    state: string;
    subscriptionPolicies: SubscriptionPolicies;
    authorizationSource: string;
}

export interface ResourceGroupProperties {
    provisioningState: string;
}

export interface ResourceGroup {
    id: string;
    name: string;
    properties: ResourceGroupProperties;
    location: string;
}

export interface Tenant {
    id: string;
    tenantId: string;
}

export interface Sku {
    name: string;
    tier: string;
    size: string;
    family: string;
    capacity: number;
}

export interface Plan {
    id: string;
    name: string;
    kind: string;
    location: string;
    type: string;
    serverFarmWithRichSkuName: string;
    status: number;
    subscription: string;
    maximumNumberOfWorkers: number;
    geoRegion: string;
    perSiteScaling: boolean;
    numberOfSites: number;
    resourceGroup: string;
    reserved: boolean;
    sku: Sku;
}

export interface HostNameSslState {
    name: string;
    sslState: number;
}

export interface Website {
    id: string;
    name: string;
    kind: string;
    location: string;
    type: string;
    siteName: string;
    state: string;
    hostNames: string[];
    repositorySiteName: string;
    usageState: number;
    enabled: boolean;
    enabledHostNames: string[];
    availabilityState: number;
    hostNameSslStates: HostNameSslState[];
    serverFarmId: string;
    lastModifiedTimeUtc: Date;
    scmSiteAlsoStopped: boolean;
    microService: string;
    clientAffinityEnabled: boolean;
    clientCertEnabled: boolean;
    hostNamesDisabled: boolean;
    outboundIpAddresses: string;
    containerSize: number;
    resourceGroup: string;
    defaultHostName: string;
}