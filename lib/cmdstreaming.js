var sfdc = require("./sfdc");
var winston = require("./logger");

exports.subscribeEvent = async function (event_name) {
    try {
        var conn = await sfdc.login();
        winston.info(event_name + ' is subscribed');
        conn.streaming.topic('/event/'+event_name).subscribe(function (message) {
            winston.info('received: ' + JSON.stringify(message.payload));
        });
    } catch (err) {
        winston.error(err);
        process.exit(1);
    }
}

exports.subscribeAllEvents = async function () {
    var conn;
    try {
        conn = await sfdc.login();
        var events = await sfdc.getPlatformEvents(conn);
        for (var event of events) {
            winston.info(event + ' is subscribed');
            conn.streaming.topic('/event/'+event).subscribe(function (message) {
                winston.info('received: ' + JSON.stringify(message.payload));
            });
        }
    } catch (err) {
        winston.error(err);
        process.exit(1);
    }
}



