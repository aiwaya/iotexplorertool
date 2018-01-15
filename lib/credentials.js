var Preferences = require('preferences');
var sfdc_credentials = new Preferences('sfdc.iot.explorer.tool');

exports.save = function(uname, passwd, is_sandbox) {
    sfdc_credentials.username = uname;
    sfdc_credentials.password = passwd;
    sfdc_credentials.token = is_sandbox;
}

exports.clear = function () {
    sfdc_credentials.username = '';
    sfdc_credentials.password = '';
    sfdc_credentials.token = '';
}

exports.get = function () {
    return {'username' : sfdc_credentials.username, 'password' : sfdc_credentials.password, 'is_sandbox' : sfdc_credentials.is_sandbox};
}