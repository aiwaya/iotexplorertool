var winston = require('winston');

// { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }

var getLoggerSettings = function() {
    var settings = {
        transports: [
            new winston.transports.File({ filename: "winston.log", json: false, level: 'debug'}),
            new winston.transports.Console({colorize: true, timestamp: true, level: 'info'})
        ],
        exceptionHandlers: [
            new winston.transports.File({ filename: "winston.log", json: false, level: 'debug'}),
            new winston.transports.Console({colorize: true, timestamp: true, level: 'info'})
        ]
    };

    return settings;
};


var logger = new (winston.Logger)(getLoggerSettings(true));

// output to only file
exports.log = function(msg) {
    logger.debug(msg);
}

// print message on console
exports.info = function(msg) {
    logger.info(msg);
}

// print message on console
exports.error = function(err) {
    logger.error(err);
}

exports.warn = function(msg) {
    logger.warn(msg);
}


function pad2(n) { return n < 10 ? '0' + n : n }

exports.timestamp = function() {
    var date = new Date();
    return date.getFullYear().toString() + pad2(date.getMonth() + 1) + pad2(date.getDate()) + pad2(date.getHours()) + pad2(date.getMinutes()) + pad2(date.getSeconds());
}