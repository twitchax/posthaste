import * as commands from '../shared/commands';
import * as helpers from '../shared/helpers';
import * as _ from 'lodash';

import * as Azure from 'ms-rest-azure';

(async function() {
    //await helpers.login();
    //await helpers.refreshLogin();
    await commands.deploy('test');
})();