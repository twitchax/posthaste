import * as commands from '../shared/commands';
import * as helpers from '../shared/helpers';
import * as _ from 'lodash';

import * as Azure from 'ms-rest-azure';

(async function() {
    console.log(JSON.stringify(await helpers.getWebsiteCredentials('test2-vyepibmz'), null, 2));
    console.log(JSON.stringify(await helpers.getWebsiteCredentials('test-acaebkjqtbln'), null, 2));
    //await commands.deploy('test');
})();