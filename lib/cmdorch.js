var sfdc = require("./sfdc");
var files = require("./files");
var fs = require('fs');
var orch = require("./orchestration");
var winston = require("./logger");


const working_dir = './tmp';
const iot_dir = working_dir + '/iot';
const obj_dir = working_dir + '/objects';

const template_orchestration_json = iot_dir + '/$NAME.orchestration';
const template_orchestration_xml = iot_dir + '/$NAME.orchestration-meta.xml';

async function init() {
    try {
        await files.delete(working_dir);
        fs.mkdirSync(working_dir);
    } catch (err) {
        winston.error('init : ' + err);
        throw err;
    }
}

async function post() {
    try {
        await files.delete(working_dir);
    } catch (err) {
        winston.error('post : ' + err);
        throw err;
    }
}

async function read_custom_objects_metadata(conn, object_names) {
    try {
        winston.info('Downloading custom object metadata: ' + object_names);
        var types = sfdc.customObjectType(object_names);
        await sfdc.retrieveMeatadata(conn, types, working_dir);

        var result = [];
        for (var i in object_names) {
            var obj = {};
            var xml = obj_dir + '/' + object_names[i] + '.object';
            obj.fields = files.get_custom_object_fields(xml);
            obj.fullName = object_names[i];
            result.push(obj);
        }
        return result;
    } catch (err) {
        winston.error(err);
        process.exit(1);
    }
}

exports.showOrchestrations = async function () {
    winston.log('showOrchestrations');
    try {
        conn = await sfdc.login();
        var names = await sfdc.getOrchestrations(conn);
        winston.info('Retrieved orchestration names ... ');
        names.forEach(function (name) {
            winston.info('  ' + name);
        });
    } catch (err) {
        winston.error(err);
        process.exit(1);
    }
}

function convert_html(template, data_set) {
    var cons = require('consolidate');
    return new Promise(function (resolve, reject) {
        cons.swig(template, data_set, function (err, html) {
            if (err) {
                reject(err);
            } else {
                resolve(html);
            }
        });
    });
}

async function convet_orchestration_html(data) {
    var context_html = '', global_rules_html = '', variables_html = '', rules_html = '';
    /************* Events & Object *****************/
    var context = '';
    try {
        context = data.context;
        var rows = context.data;
        for (var row of rows) {
            var table = await convert_html('./lib/temps/event_object_template.html', {
                rows: row.fields,
                label: row.label,
                fullName: row.fullName
            });
            context_html = context_html.concat(table);
        }
    } catch (err) {
        winston.error('error during event & object html');
        winston.error('context data: ' + JSON.stringify(context));
        throw err;
    }

    /************* Global Rules Tab ***************/
    var global_rules = '';
    try {
        global_rules = data.orchestration['global rules'];
        global_rules_html = await convert_html('./lib/temps/global_rule_template.html', {
            rows: global_rules,
            state: 'Global Rules'
        })
    } catch (err) {
        winston.error('error during global rules html');
        winston.error('global rules: ' + JSON.stringify(global_rules));
        throw err;
    }

    /************* Variable Tab ******************/
    var vars = '';
    try {
        vars = data.orchestration['variables'];
        var table = await convert_html('./lib/temps/variable_template.html', {
            rows: vars
        });
        variables_html = table;
    } catch (err) {
        winston.error('error during variable html');
        winston.error('vars: ' + JSON.stringify(vars));
        throw err;
    }

    /************* Rule Tab **********************/
    var states = '';
    try {
        states = data.orchestration['states']; // array
        for (var state of states) {
            var state_name = state.name;
            var table = await convert_html('./lib/temps/rule_template.html', {rows: state.rows, state: state.name})// Default
            rules_html = rules_html.concat(table);
        }
    } catch (err) {
        winston.error('error during rule html');
        winston.error('states: ' + JSON.stringify(states));
        throw err;
    }

    try {
        var doc_base = fs.readFileSync('./lib/temps/doc_template.html', 'utf8');
        doc_base = doc_base.replace('$rules_html', rules_html).replace('$global_rules_html', global_rules_html).replace('$variables_html', variables_html).replace('$context_html', context_html);
        return doc_base;
    } catch (err) {
        winston.error('error during html');
        throw err;
    }
}

function contains_orchestration(orchestration_name) {
    try {
        var orchestration_xml = template_orchestration_xml.replace('$NAME', orchestration_name);
        return fs.existsSync(orchestration_xml)
    } catch (err) {
        return false;
    }
}

exports.createOrchestrationDoc = async function (orchestration_name) {
    winston.log('createdoc');
    try {
        init();
        conn = await sfdc.login();

        var orchestration_json = template_orchestration_json.replace('$NAME', orchestration_name);
        var orchestration_xml = template_orchestration_xml.replace('$NAME', orchestration_name);
        var package_xml = working_dir + '/package.xml';

        var types = sfdc.orchestrationType(orchestration_name);
        await sfdc.retrieveMeatadata(conn, types, working_dir);
        winston.info('Download orchestration: ' + orchestration_name);

        if (!contains_orchestration(orchestration_name)) {
            winston.info(orchestration_name + ' is not found at your org');
            throw new Error(orchestration_name + ' is invalid');
        }

        var context_name = files.get_context_name(orchestration_xml);
        types = sfdc.contextType(context_name);

        await sfdc.retrieveMeatadata(conn, types, working_dir);
        winston.info('Download context: ' + context_name);

        var orchestration_context = iot_dir + '/' + context_name + '.orchestrationContext';
        var info = files.get_events_object(orchestration_context);
        var metas = await sfdc.read_custom_objects(conn, info['events_objects']);
        winston.info('Download platform events and reference object meta data');

        // create context info
        var contex = {'Context Name': context_name, 'data': []};
        for (var meta of metas) {
            var event_or_obj = {'fullName': meta.fullName, 'label': meta.label};
            var fields = [];
            var fs = [];
            if(Array.isArray(meta.fields)) {
                fs = meta.fields;
            } else {
                fs.push(meta.fields);
            }
            for (var field of fs) {
                fields.push({'fullName': field.fullName, 'label': field.label, 'type': field.type});
            }
            event_or_obj.fields = fields;

            if (meta.fullName.endsWith('__e')) {
                event_or_obj.type = 'Event Data';
            } else {
                event_or_obj.type = 'Reference Data';
            }
            contex.data.push(event_or_obj);
        }

        var orc_data = orch.create_orchestration_data(orchestration_json);
        var data = {'context': contex, 'orchestration': orc_data};
        winston.log('doc data: ' + JSON.stringify(data));
        var result_doc = await convet_orchestration_html(data);
        var file_name = orchestration_name + '.html';
        files.create_file(file_name, result_doc);
        winston.info(file_name + ' is created');
    } catch (err) {
        winston.error(err);
        process.exit(1);
    } finally {
        post();
    }
}

exports.downloadOrchestration = async function (orchestration_name) {
    winston.log('downloadOrchestration');
    try {
        init();
        conn = await sfdc.login();

        var zip_name = orchestration_name + winston.timestamp() + '.zip';
        var types = sfdc.orchestrationType(orchestration_name);
        await sfdc.retrieveMeatadata(conn, types, working_dir);

        if (!contains_orchestration(orchestration_name)) {
            winston.info(orchestration_name + ' is not found at your org');
            throw new Error(orchestration_name + ' is invalid');
        }

        await files.zip_files(working_dir, zip_name);
        winston.info('Successed to download : ' + zip_name);
    } catch (err) {
        winston.error(err);
        process.exit(1);
    } finally {
        post();
    }
}

exports.deployOrchestration = async function (meta_zip) {
    winston.log('deployOrchestration');
    try {
        if (!fs.existsSync(meta_zip)) {
            winston.info('zip file does not exist : ' + meta_zip);
            throw new Error('meta zip can not be found');
        }

        conn = await sfdc.login();
        var zipStream = fs.createReadStream(meta_zip);

        // deploy zip to SFDC
        await sfdc.deploy(conn, zipStream);
        winston.info('deployment done');
    } catch (err) {
        winston.error(err);
        process.exit(1);
    }
}


/*
 XxxContext.orchestrationContext
 PlatformEvents and ReferenceObject(API name and primary key)

 Xxx.orchestration-meta.xml
 Context name and Orchestration label

 Xxx.orchestration
 Logic
 */
exports.backupOrchestration = async function (orchestration_name, new_orchestration_name, is_debuglog_needed) {
    winston.log('backupOrchestration');
    try {
        if (orchestration_name == new_orchestration_name) {
            var msg = 'orchestration name is not equal to new orchestration name.';
            winston.info(msg);
            throw new Error(msg);
        }
        init();
        conn = await sfdc.login();

        var old_orchestration_json = template_orchestration_json.replace('$NAME', orchestration_name);
        var new_orchestration_json = template_orchestration_json.replace('$NAME', new_orchestration_name);

        var old_orchestration_xml = template_orchestration_xml.replace('$NAME', orchestration_name);
        var new_orchestration_xml = template_orchestration_xml.replace('$NAME', new_orchestration_name);

        var package_xml = working_dir + '/package.xml';

        winston.log('old_orch_json:' + old_orchestration_json);
        winston.log('new_orch_json:' + new_orchestration_json);
        winston.log('old_orch_xml:' + old_orchestration_xml);
        winston.log('new_orch_xml:' + new_orchestration_xml);
        winston.log('package_xml:' + package_xml);

        var types = sfdc.orchestrationType(orchestration_name);

        winston.info('Downloading orchestration: ' + orchestration_name);
        await sfdc.retrieveMeatadata(conn, types, working_dir);

        if (!fs.existsSync(old_orchestration_xml)) {
            winston.info(orchestration_name + ' is not found at your org');
            throw new Error(orchestration_name + ' is invalid');
        }

        var context_name = files.get_context_name(old_orchestration_xml);
        types = sfdc.contextType(context_name);

        winston.info('Downloading context: ' + context_name);
        await sfdc.retrieveMeatadata(conn, types, working_dir);

        var orchestration_context = iot_dir + '/' + context_name + '.orchestrationContext';
        var info = files.get_events_object(orchestration_context);
        //var meta = await sfdc.read_custom_objects(conn, info['events_objects']);
        var meta = await read_custom_objects_metadata(conn, info['events_objects']);

        if (is_debuglog_needed) {
            winston.info('Adding debug logs to orchestration');
            var new_json = orch.create_orchestration_with_debuglog_json(meta, old_orchestration_json, info['refernce_obj'], info['reference_obj_pk'], orchestration_name);
            fs.writeFileSync(new_orchestration_json, JSON.stringify(new_json));
            fs.unlinkSync(old_orchestration_json);
        } else {
            files.rename(old_orchestration_json, new_orchestration_json);
        }

        // delete files
        fs.unlinkSync(orchestration_context);
        fs.unlinkSync(old_orchestration_xml);
        fs.unlinkSync(package_xml);

        // create files
        var data = fs.readFileSync('./lib/temps/package_template.xml', 'utf8');
        fs.writeFileSync(package_xml, data.replace('$orchestration_name', new_orchestration_name));

        data = fs.readFileSync('./lib/temps/orchestration-meta_template.xml', 'utf8');
        fs.writeFileSync(new_orchestration_xml, data.replace('$context', context_name).replace('$label', new_orchestration_name));

        var zip_name = './tempzip.zip';
        // zip files
        await files.zip_files(working_dir, zip_name);
        var zipStream = fs.createReadStream(zip_name);

        winston.info('Deploying new orchestration..');
        // deploy zip to SFDC
        await sfdc.deploy(conn, zipStream);

        fs.unlinkSync(zip_name);
        winston.info('Completed to deploy');
    } catch (err) {
        winston.error(err);
        process.exit(1);
    } finally {
        post();
    }
}






