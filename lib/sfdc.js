var jsforce = require('jsforce');
var fs = require('fs');
var unzip = require('unzip');
var fstream = require('fstream');
var winston = require("./logger");
var cmgr = require("./credentials");

const API_V = '41.0';


exports.login = function() {
    var credentials = cmgr.get();
    winston.log('try to login as ' + credentials.username);
    return new Promise(function (resolve, reject) {
        var is_sandbox = credentials.is_sandbox;
        var username = credentials.username;
        var password = credentials.password;

        var conn;
        if(is_sandbox) {
            conn = new jsforce.Connection({loginUrl: 'https://test.salesforce.com'});
        } else {
            conn = new jsforce.Connection();
        }
        conn.login(username, password, function (err, userInfo) {
            if (err) {
                winston.error('Login failure.');
                reject(err);
                return;
            }
            resolve(conn);
        });

    });
};
/*

exports.login = function() {
    winston.log('try to login as ' + username);
    var username = prefs.username;
    var password = prefs.password;
    var is_sandbox = prefs.is_sandbox;
    winston.info('username:' + username);
    winston.log('is_sandbox:' + is_sandbox);
    auth(username, password, is_sandbox);
};
*/

exports.getOrchestrations = function(conn) {
    return new Promise(function (resolve, reject) {
        winston.log('getOrchestrations');
        var result = [];
        var types = [{type: 'Orchestration', folder: null}];
        conn.metadata.list(types, API_V, function (err, metadata) {
            if (err) {
                winston.error('can not get orchestration');
                reject(err);
                return;
            }
            if(metadata == undefined) {
                result.push('No Orchestration');
                metadata = [];
            }
            if(!Array.isArray(metadata)) {
                metadata = [metadata];
            }
            for (var meta of metadata) {
                var id = meta["id"];
                var fullNmae = meta["fullName"];
                result.push(fullNmae);
            }
            resolve(result);
        });
    });
}

exports.getPlatformEvents = function(conn) {
    return new Promise(function (resolve, reject) {
        winston.log('getPlatformEvents');
        var result = [];
        var types = [{type: 'CustomObject', folder: null}];
        conn.metadata.list(types, API_V, function (err, metadata) {
            if (err) {
                reject(err);
                return;
            }
            for (var meta of metadata) {
                var id = meta["id"];
                var fullNmae = meta["fullName"];
                if(fullNmae.endsWith('__e')) {
                    result.push(fullNmae);
                }
            }
            resolve(result);
        });
    });
}

exports.orchestrationType = function(orchestration_name) {
    return [{
        'members': orchestration_name,
        'name': 'Orchestration'
    }];
}

exports.contextType = function(context_name) {
    return [{
        'members': context_name,
        'name': 'OrchestrationContext'
    }];
}

exports.customObjectType = function(obj_names) {
    return [{
        'members': obj_names,
        'name': 'CustomObject'
    }];
}

exports.create_object = function(conn, object_name, fields) {
    winston.log('create object');
    return new Promise(function (resolve, reject) {
        conn.sobject(object_name).create(fields, function(err, ret) {
            if (err || !ret.success) {
                winston.error(err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}


exports.read_custom_objects = function(conn, object_name_array) {
    winston.log('read_custom_objects');
    return new Promise(function (resolve, reject) {
        conn.metadata.read('CustomObject', object_name_array, function (err, metadata) {
            if (err) {
                winston.error(err);
                reject(err);
            } else {
                resolve(metadata);
            }
        });
    });
}

exports.deploy = function(conn, zip_stream) {
    winston.log('deploy');
    return new Promise(function (resolve, reject) {
        conn.metadata.deploy(zip_stream, {singlePackage: true})
            .complete(function (err, result) {
                if (err) {
                    winston.error('deploy failed :' + err);
                    reject(err);
                    return;
                }
                winston.info('Deployment result : ');
                winston.info('  id: ' + result.id);
                winston.info('  status: ' + result.status);
                winston.info('  createdDate: ' + result.createdDate);
                winston.info('  done: ' + result.done);
                if(!result.success) {
                    reject(new Error('Deploy failed'));
                    return;
                }
                resolve();
            });
    });
}

exports.retrieveMeatadata = function(conn, types, output_dir) {
    winston.log('retrieveMeatadata');
    return new Promise(function (resolve, reject) {
            var zipname = 'tmp.zip';
            var w = fs.createWriteStream(zipname);
            w.on('close', function () {
                try {
                    var readStream = fs.createReadStream(zipname);
                    var writeStream = fstream.Writer(output_dir);
                    writeStream.on('close', function () {
                        fs.unlinkSync(zipname);
                        resolve();
                    });
                    readStream
                        .pipe(unzip.Parse())
                        .pipe(writeStream);
                }
                catch (err) {
                    reject(err);
                }
            });
            conn.metadata.retrieve({
                apiVersion: '41.0',
                singlePackage: true,
                unpackaged: {
                    types: types
                }
            }).stream().pipe(w)
    });
}




