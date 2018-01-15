var fs = require('fs');
var winston = require("./logger");

const sep = '\\", \\"';
const empty = '\\"\\"';

function createAction(num, event_data, key, state, variable_data, reference_data, when, condition) {
    try {
        winston.log('createAction function');
        var json = require('./temps/action_template.json');
        var str = JSON.stringify(json);

        if (!event_data)
            event_data = empty;
        if (!reference_data)
            reference_data = empty;

        str = str.replace('$event_data', event_data);
        str = str.replace('$key', key);
        str = str.replace('$state', state);
        str = str.replace('$variable_data', variable_data);
        str = str.replace('$reference_data', reference_data);
        str = str.replace('$when', when);
        str = str.replace('$condition', condition);
        str = str.replace('999', num);
        return JSON.parse(str);
    } catch (err) {
        winston.error(err);
        throw err;
    }
}

function createThenAction(label, fname, type) {
    try {
        winston.log('createThenAction function');
        var line;
        if (type == 'Text' || type == 'Email') {
            line = "'" + label + ":'&" + fname;
        } else if (type == 'Picklist' || type == 'Datetime' || type == 'Date' || type == 'Number') {
            line = "'" + label + ":'&TEXT(" + fname + ")";
        } else if (type == 'Checkbox' || type == 'Boolean') {
            line = "'" + label + ":'&IF(" + fname + "<> False, 'True','False')";
        } else {
            winston.log('label:' + label + ' fname:' + fname + ' type:' + type + ' is not supported');
            line = '';
        }
        return line;
    } catch (err) {
        winston.error(err);
        throw err;
    }
}

function get_refernce_obj_pk_type(metadata, reference_object, reference_obj_pk) {
    try {
        winston.log('get_refernce_obj_pk_type function');
        for (var i = 0; i < metadata.length; i++) {
            var meta = metadata[i];
            var name = meta.fullName;
            if (name == reference_object) {
                if (meta.fields.length == undefined) {
                    if (meta.fields.fullName == reference_obj_pk)
                        return meta.fields.type;
                    else
                        throw new Error('reference object pk type is undefied');
                }

                for (var j = 0; j < meta.fields.length; j++) {
                    if (meta.fields[j].fullName == reference_obj_pk) {
                        return meta.fields[j].type;
                    }
                }
            }
        }
    } catch (err) {
        winston.error(err);
        throw err;
    }
}

function get_local_variables_formula(orchestration_json) {
    try {
        winston.log('get_local_variables_formula function');
        var json = JSON.parse(fs.readFileSync(orchestration_json));
        var variables = json["interaction"]["localVariables"];
        if (variables.length == 0) {
            return empty;
        }
        var variable_data = '';
        for (var lval of variables) {
            var name = lval["name"];
            var type = lval["dataType"]; //Boolean, Date, DateTime, Number, Text
            var line = createThenAction(name, name, type);
            if (line != '' && variable_data != '') {
                line = '&' + sep + '&' + line;
            }
            variable_data = variable_data.concat(line);
        }
        return variable_data;
    } catch (err) {
        winston.error(err);
        throw  err;
    }
}


function get_events_object_formula(events_obj_meta, orchestration_json) {
    try {
        winston.log('get_events_object_formula function');
        var json = JSON.parse(fs.readFileSync(orchestration_json, 'utf8'));

        var h = new Object();
        for (var i = 0; i < events_obj_meta.length; i++) {
            var meta = events_obj_meta[i];
            var lines = '';
            var name = meta.fullName;
            for (var j = 0; j < meta.fields.length; j++) {
                var type = meta.fields[j].type;
                var fname = name + "." + meta.fields[j].fullName;
                var label = meta.fields[j].label;

                var line = createThenAction(label, fname, type);
                if (line != '' && lines != '') {
                    line = '&' + sep + '&' + line;
                }

                lines = lines.concat(line);
            }
            h[name] = lines;
        }
        return h;
    } catch (err) {
        winston.error(err);
        throw  err;
    }
}

function add_debuglog(h, reference_object, reference_obj_pk, reference_obj_pk_type, orchestration_json, local_vars_formula) {
    try {
        winston.log('add_debuglog function');
        var key = reference_object + '.' + reference_obj_pk;
        if (reference_obj_pk_type == 'Number') {
            key = 'TEXT(' + key + ')';
        }

        var json = JSON.parse(fs.readFileSync(orchestration_json, 'utf8'));

        for (var state of json["interaction"]["states"]) {
            var state_name = state['name'];
            if (state_name == 'Always')
                continue;
            for (var action of state["actions"]) {
                // state entered : condition, state, descriptionが""
                var condition = action['condition'];

                var reference_data = h[reference_object];
                var event = action['eventSource'];
                var event_data = h[event];
                var when = action['when']['name'];
                if (when == 'always') {
                    if (event == undefined) {
                        when = 'Any Event';
                    } else {
                        when = event;
                    }
                }

                if (when == 'hour' || when == 'day') {
                    when = action['when']['params']['$1'] + when;
                    event_data = '';
                }

                var thenActions = action["action"];
                var new_action = createAction(1, event_data, key, state_name, local_vars_formula, reference_data, when, condition);

                if (thenActions[thenActions.length - 1]["name"] == "changeState") {
                    var tran = thenActions[thenActions.length - 1];
                    thenActions[thenActions.length - 1] = new_action;
                    tran["id"] = thenActions.length - 1;
                    thenActions.push(tran);
                } else {
                    thenActions.push(new_action);
                }
            }
        }

        for (var state of json["interaction"]["states"]) {
            if (state["name"] == 'Always')
                continue;
            for (var action of state["actions"]) {
                var thenActions = action["action"];
                for (var i = 0; i < thenActions.length; i++) {
                    var thenAction = thenActions[i];
                    thenAction["id"] = i;
                }

            }
        }
        return json;
    } catch (err) {
        winston.error(err);
        throw  err;
    }
}

function get_state_name(json_root, state_id) {
    return json_root["interaction"]["states"][state_id]["name"];
}

function get_when_value(action) {
    try {
        winston.log('get_when_value function');
        var when_name = action['when']['name'];
        var event_source = action['eventSource']; // zz__e
        var when;
        if (when_name == 'always') {
            if (event_source != undefined) {
                winston.log(' IF/When:' + event_source);
                when = event_source;
            } else {
                winston.log(' IF/When:AnyEvent');
                when = 'AnyEvent';
            }
        } else if (when_name == 'immediately') {
            winston.log(' IF/When:State Entered');
            when = 'State Entered';
        } else {
            var params = action['when']['params']['$1'];
            winston.log(' IF/When:' + params + when_name);
            when = params + ' ' + when_name;
        }
        return when;
    } catch (err) {
        winston.error(err);
        throw  err;
    }
}

function get_then_action(action) {
    try {
        winston.log('get_then_acion function');
        var thenaction = {};
        winston.log('  Then Action');
        var name = action['name'];
        thenaction.type = name;
        if (name.startsWith('salesforceObject')) {
            var label = action.label;
            var oname = action.sObjectApiName;
            thenaction.tString = oname;
            if (name == 'salesforceObjectCreate') {

            } else if (name == 'salesforceObjectRead') {

            } else if (name == 'salesforceObjectEdit') {

            } else if (name == 'salesforceObjectDelete') {

            } else {
                winston.info(name + ': Then action is not supported');
                thenaction.tString = name + ' is not supported';
            }
        } else if (name == 'assignVar') {
            var left = action['params']['$1'];
            var right = action['params']['$2'];
            thenaction.tString = left + ' = ' + right;
            // left = right
        } else if (name == 'reset') {
            var param = action['params']['$1'];
            thenaction.tString = 'reset ' + param;
        } else if (name == 'terminate') {
            thenaction.tString = '';
            //var param = action['params']['$1'];
        } else {
            winston.info(name + ': Then action is not supported');
            thenaction.tString = name + ' is not supported right now';
        }
        return thenaction;
    } catch (err) {
        winston.error(err);
        throw  err;
    }
}

exports.create_orchestration_data = function (orchestration_json) {
    var result = {};
    var json = JSON.parse(fs.readFileSync(orchestration_json, 'utf8'));

    /***************** Local Variables **********************/
    var variables = [];
    for (var lvar of json['interaction']['localVariables']) {
        var v = {};
        try {
            v.condition = lvar.condition;
            v.dataType = lvar.dataType;
            v.description = lvar.description;
            v.eventSource = lvar.eventSource;
            v.initialValue = lvar.initialValue;
            v.name = lvar.name;

            if (lvar.value.type == 'custom') {
                v.value = lvar.value.script;
            } else { // type = catalog
                v.value = JSON.stringify(lvar.value.params);
                //v.value = lvar.value.name + ' ' + lvar.value.params.$1 + ' over ' + lvar.value.params.$2;
            }
        } catch (err) {
            v.value = 'error: ' + err;
        } finally {
            variables.push(v);
        }
    }
    result['variables'] = variables;


    /***************** Global Rules *********************/

    var global_rules = [];
    for (var state of json["interaction"]["states"]) {
        var state_name = state['name'];
        if (state_name != 'Always')
            continue;

        var row = {};
        winston.log('------------------------------------');
        winston.log('[State:' + state_name + ']');

        for (var act of state["actions"]) {
            var row = {};
            try {
                row.if = act.condition;
                row.description = act.description;
                row.change_state = 'None';
                if (act.action == null || act.action == '') {
                    row.action = '';
                    row.when = act.when;
                } else {
                    row.action = get_then_action(act.action[0]);
                    if (act.action.length == 2 && act.action[1].name == 'changeState') {
                        var num = act.action[1].params.$1;
                        row.change_state = get_state_name(json, num);
                    }
                    row.when = get_when_value(act);
                }

            } catch (err) {
                row.description = 'error: ' + err;
            } finally {
                global_rules.push(row);
            }
        }
    }
    result['global rules'] = global_rules;


    /******************* Rules ***********************/

    var states = [];
    for (var state of json["interaction"]["states"]) {
        var state_name = state['name'];
        if (state_name == 'Always') // Globale Rule
            continue;
        var s = {};
        s.name = state_name;
        s.rows = [];
        winston.log('------------------------------------');
        winston.log('[State:' + state_name + ']');

        // State
        for (var act of state["actions"]) {
            var row = {};
            try {
                row.ifwhen = get_when_value(act);
                var condition = act['condition'];
                winston.log('  ' + condition);
                row.condition = condition;
                row.actions = [];

                row.transition = '';

                // Then Action
                for (var a of act['action']) {
                        if (a.name == 'changeState') {
                            var move_to = a['params']['$1']; // state id
                            row.transition = get_state_name(json, move_to);
                            continue;
                    }
                    if (a.name == 'terminate') {
                        var move_to = a['params']['$1']; // state id
                        row.transition = 'Exit:' + move_to;
                        continue;
                    }

                    var thenaction = get_then_action(a);
                    row.actions.push(thenaction);
                }

            } catch (err) {
                row.condition = 'error: ' + err;
            } finally {
                s.rows.push(row);
            }
        }
        states.push(s);
    }
    result['states'] = states;
    return result;
}

exports.create_orchestration_with_debuglog_json = function (events_obj_meta, orchestration_json, refernce_obj, reference_obj_pk, orchestration_name) {
    try {
        winston.log('PlatformEvent(s) and A Object');
        events_obj_meta.forEach(function (elm) {
            winston.log('API name: ' + elm.fullName + ' Lable: ' + elm.label);
        })
        winston.log('orchestration_json: ' + orchestration_json);
        winston.log('refernce_obj.pk: ' + refernce_obj + '.' + reference_obj_pk);
        winston.log('orchestration_name: ' + orchestration_name);

        // h contains salesforce formula to reterive event data and record for supported field type such as date, datetime, text...
        // API name like Router__e as key for this hash
        var h = get_events_object_formula(events_obj_meta, orchestration_json);
        winston.log("formula tables for events and object:" + h);

        var reference_obj_pk_type = get_refernce_obj_pk_type(events_obj_meta, refernce_obj, reference_obj_pk);
        winston.log('reference object pk type:' + reference_obj_pk_type);

        // local_vars_formula contains formula to retreive local variable data
        var local_vars_formula = get_local_variables_formula(orchestration_json);
        winston.log('local variable formula:' + local_vars_formula);

        var json_with_debuglog = add_debuglog(h, refernce_obj, reference_obj_pk, reference_obj_pk_type, orchestration_json, local_vars_formula);
        return json_with_debuglog;
    } catch (err) {
        throw err;
    }
}