var unzip = require('unzip');
var fs = require('fs');
var fstream = require('fstream');
var cheerio = require('cheerio');
var zipFolder = require('zip-folder');
var che = require('cheerio');
var winston = require("./logger");

exports.rename = function (file1, file2) {
    return new Promise(function (resolve, reject) {
        if (!fs.existsSync(file1)) {
            reject(new Error('' + file1 + ' does not exist'));
            return;
        }
        fs.rename(file1, file2, function (err) {
            if (err) {
                winston.error('can not rename ' + file1 + ' with ' + file2);
                reject();
                return;
            }
            resolve();
        });
    });
}

exports.delete = function (target_dir) {
    return new Promise(function (resolve, reject) {
        try {
            if (fs.existsSync(target_dir)) {
                var rimraf = require('rimraf');
                rimraf(target_dir, function () {
                    resolve();
                    return;
                });
            } else {
                resolve();
            }
        }catch(err) {
            winston.error('can not delete direcrory :' + target_dir);
            reject(err);
        }
    });

}

exports.zip_files = function (target_dir, zip_name) {
    return new Promise(function (resolve, reject) {
        zipFolder(target_dir, zip_name, function (err) {
            if (err) {
                winston.error('can not zip files. target_dir:' + target_dir + ' zip name:' + zip_name);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

exports.get_custom_object_fields = function (object_xml) {
    try {
        if (!fs.existsSync(object_xml)) {
            throw new Error('' + object_xml + ' does not exist');
        }
        var fields = [];
        var xml_data = fs.readFileSync(object_xml, "utf-8");
        $ = cheerio.load(xml_data, {xmlMode: true});
        $('fields').each(function(i, elm) {
            var field = {};
            var name = $(this).find('fullName').text();
            var type = $(this).find('type').text();
            var label = $(this).find('label').text();

            field['fullName'] = name;
            field['type'] = type;
            field['label'] = label;
            fields.push(field);
            winston.log(name + ':' + type); // for testing do text()
        });
        return fields;
    } catch (err) {
        winston.error('can not replace xml');
        throw err;
    }
}


exports.replace_xml = function (xml, element_name, text_value) {
    try {
        if (!fs.existsSync(xml)) {
            throw new Error('' + xml + ' does not exist');
        }

        var xml_data = fs.readFileSync(xml, "utf-8");
        $ = cheerio.load(xml_data, {xmlMode: true});
        $(element_name).text(text_value);
        fs.writeFileSync(xml, $.xml(), 'utf-8');
    } catch (err) {
        winston.error('can not replace xml');
        throw err;
    }
}

exports.create_file = function (filename, content) {
    try {
        fs.writeFileSync(filename, content, 'utf-8');
    } catch (err) {
        winston.error('can not create');
        throw err;
    }
}

exports.get_context_name = function (orchestration_xml) {
    try {
        if (!fs.existsSync(orchestration_xml)) {
            throw new Error('' + orchestration_xml + ' does not exist');
        }

        var xml_data = fs.readFileSync(orchestration_xml, "utf-8");
        $ = che.load(xml_data);

        var context_name = $("Context").text();
        return context_name;
    } catch (err) {
        winston.error('can not get context name at ' + orchestration_xml);
        throw err;
    }
}

exports.get_events_object = function (context_json) {
    try {
        var objs = new Array();
        if (!fs.existsSync(context_json)) {
            throw new Error('' + context_json + ' does not exist');
        }
        data = fs.readFileSync(context_json, "utf-8");
        $ = che.load(data);

        $("events").each(function (i, el) {
            var pe = $(this).children("PlatformEvent").text();
            objs.push(pe);
        });
        var reference_obj = $("SalesforceObject").text();
        var reference_obj_pk = $("salesforceObjectPrimaryKey").text();

        objs.push(reference_obj);
        return {'events_objects': objs, 'refernce_obj': reference_obj, 'reference_obj_pk': reference_obj_pk};
    } catch (err) {
        winston.error('can not get events and object at ' + context_json);
        throw err;
    }
}