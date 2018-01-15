var sfdc = require("./sfdc");
var files = require("./files");
var fs = require('fs');
var winston = require("./logger");

function sleep_s(s) {
    return new Promise(function (resolve, reject) {
        try {
            setTimeout(resolve, s * 1000);
        } catch (err) {
            reject();
        }
    });
}

exports.showPlatformEvents = async function () {
    try {
        conn = await sfdc.login();
        var events = await sfdc.getPlatformEvents(conn);
        winston.info('');
        winston.info('Retrieved platform event names ... ');
        for (var event of events) {
            winston.info('  ' + event);
        }
    } catch (err) {
        winston.error(err);
        process.exit(1);
    }
}

exports.firePlatformEvents = async function (json_file) {
    if (!fs.existsSync(json_file)) {
        winston.info(json_file + ' is not found');
        throw new Error(json_file + ' does not exist');
    }
    var events = '';
    try {
        conn = await sfdc.login();
        events = JSON.parse(fs.readFileSync(json_file));
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var wait_for = event['Wait_For'];
            var event_name = event['Event_Name'];
            winston.info('will create ' + event_name + ' after ' + wait_for + ' sec');
            await sleep_s(wait_for);
            delete event['Wait_For'];
            delete event['Event_Name'];
            sfdc.create_object(conn, event_name, event);
            winston.info(event_name + ' is created');
        }
    } catch (err) {
        winston.error(err);
        try {
            winston.error('platform data format: ' + JSON.stringify(events));
        } catch (err) {
            winston.error('can not stringfy input platform event data json file');
        }
        process.exit(1);
    }
}

exports.createSampleEventJsonFile = async function (platform_event_name) {
    winston.log('createSampleEventJsonFile');
    try {
        conn = await sfdc.login();
        var events = [];
        events.push(platform_event_name);

        var root = [];
        var row = {};
        var meta = await sfdc.read_custom_objects(conn, events);
        winston.info('download platform event meta data');

        var fullName = meta['fullName'];
        var label = meta['label'];
        row['Event_Name'] = fullName;
        row['Wait_For'] = 5;
        for (var field of meta['fields']) {
            var fullName = field['fullName'];
            var label = field['label'];
            var type = field['type'];
            var value;
            if ('Checkbox' == type) {
                value = true;
            } else if ('DateTime' == type) {
                value = "2017-12-28T09:26:59.709Z";
            } else if ('Date' == type) {
                value = "2017-12-28";
            } else if ('Number' == type) {
                value = 100;
            } else if ('LongTextArea' == type) {
                value = 'Long Text Area';
            } else if ('Text' == type) {
                value = 'Text';
            } else {
                value = 'Not Supported';
            }
            row[fullName] = value;
        }
        root.push(row);
        root.push(row);
        root.push(row);
        root.push(row);
        var file_name = platform_event_name + winston.timestamp() + '.json';
        await files.create_file(file_name, JSON.stringify(root, null, 4));
        winston.info(file_name + ' is created');
    } catch (err) {
        winston.error(err);
        process.exit(1);
    }
}

