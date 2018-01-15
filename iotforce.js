#!/usr/bin/env node
var clear = require('clear');
const {auth, clearCredential, showCredential} = require('./lib/cmdorg');
const {showOrchestrations, createOrchestrationDoc, downloadOrchestration, deployOrchestration, backupOrchestration, getOrchestrations} = require('./lib/cmdorch');
const {firePlatformEvents, createSampleEventJsonFile, showPlatformEvents} = require('./lib/cmdpevent');
const {subscribeEvent, subscribeAllEvents} = require('./lib/cmdstreaming');
const program = require('commander');
const {prompt} = require('inquirer');


//clear();


program
    .version('0.0.1')
    .description('Salesforce IoT Explorer Dev Tool')


const questions1 = [
    {
        type: 'input',
        name: 'username',
        message: 'Enter username ...'
    },
    {
        type: 'password',
        name: 'password',
        message: 'Enter password ...'
    },
    {
        type: 'confirm',
        name: 'is_sandbox',
        message: 'Is it for Sandbox: '
    }
];

// Organization Commands
program
    .command('org:auth')
    .alias('au')
    .description('[Org] Login Salesforce org and locally save login credentials')
    .action(() => {
        prompt(questions1).then(answers =>
            auth(answers));
    });

program
    .command('org:clear')
    .alias('cl')
    .description('[Org] Clear login credentials from your PC')
    .action(() => {
        clearCredential({});
    });

program
    .command('org:which')
    .alias('wh')
    .description('[Org] Show stored login credentials')
    .action(() => {
        showCredential({});
    });




// Orchestratin Commands
program
    .command('orch:list')
    .alias('ol')
    .description('[Orch] List all orchestration names at your org')
    .action(() => {
        showOrchestrations({});
    });

program
    .command('orch:retrieve <name>')
    .alias('or')
    .description('[Orch] Retreive the specific orchestration metadata as zip file. <name> is orchestration name')
    .action(name => downloadOrchestration(name));

program
    .command('orch:document <name>')
    .alias('oh')
    .description('[Orch] Create a orchestration, platform events, and referenced object html file. <name> is orchestration name')
    .action(name => createOrchestrationDoc(name));


program
    .command('orch:upload <meta_zip>')
    .alias('ou')
    .description('[Orch] Upload an orchestration metadta zip file to your org. <meta_zip> is absolute path of metadata.zip')
    .action((meta_zip) => {
        deployOrchestration(meta_zip);
    });

program
    .command('orch:backup <name> <new_name>')
    .alias('ob')
    .description('[Orch] Copy an orchestration to your org with new name. <name> is target orchestration name and <new_name> is new orchestration name as copy')
    .action((name, new_name) => {
        backupOrchestration(name, new_name, false);
    });

program
    .command('orch:debuglog <name> <new_name>')
    .alias('od')
    .description('[Orch] Copy an orchestration with new name and add debug logs to it. <name> is target orchestration name and <new_name> is new orchestration name as copy. Before this command, please install this pacakge at https://goo.gl/Ts1Y8D')
    .action((name, new_name) => {
        backupOrchestration(name, new_name, true);
    });






// Platform Event Commands
program
    .command('pevent:fire <json_file>')
    .alias('pf')
    .description('[PEvent] Fire sequentially platfom events based on json file.')
    .action(json_file => firePlatformEvents(json_file));

program
    .command('pevent:list')
    .alias('pl')
    .description('[PEvent] List all platform events at your org')
    .action(() => {
        showPlatformEvents({});
    });

program
    .command('pevent:data <name>')
    .alias('pd')
    .description('[PEvent] Create json file for firing sequentially platform events for test')
    .action(name => createSampleEventJsonFile(name));





// Streaming API
program
    .command('stream:event <name>')
    .alias('se')
    .description('[Stream] Subscribe a platform event. <name> is platform event name')
    .action(name => subscribeEvent(name));

program
    .command('stream:allevents')
    .alias('sa')
    .description('[Stream] Subscribe all platform events')
    .action(() => {
        subscribeAllEvents({});
    });





program.parse(process.argv);









