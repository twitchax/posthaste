"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers = require("../shared/helpers");
(async function () {
    console.log(JSON.stringify(await helpers.getWebsiteCredentials('test2-vyepibmz'), null, 2));
    console.log(JSON.stringify(await helpers.getWebsiteCredentials('test-acaebkjqtbln'), null, 2));
    //await commands.deploy('test');
})();
//# sourceMappingURL=go.js.map