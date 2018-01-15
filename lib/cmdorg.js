var sfdc = require("./sfdc");
var files = require("./files");
var fs = require('fs');
var cmgr = require("./credentials");

var winston = require("./logger");

exports.showCredential = function () {
    var credentials = cmgr.get();
    winston.info('username:' + credentials.username);
    winston.info('password:' + credentials.password);
    winston.info('is sandbox?:' + credentials.is_sandbox);
}

exports.clearCredential = function () {
    cmgr.clear();
    winston.info('Cleared your login credential');
}

exports.auth = async function(answers) {
    var conn;
    try {
        cmgr.save(answers['username'], answers['password'], answers['is_sandbox']);
        conn = await sfdc.login();

        winston.info('Succeeded to login');
        winston.info('Your login credentials are locally saved');
    } catch (err) {
        winston.error(err);
        winston.info('Failed to login');

        process.exit(1);
    }
}

