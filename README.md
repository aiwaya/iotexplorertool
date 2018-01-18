# iotexplorertool
  Usage: iotforce [options] [command]

  Salesforce IoT Explorer Dev Tool


  Options:

    -V, --version  output the version number
    -h, --help     output usage information


  Commands:

    org:auth|au                         [Org] Login Salesforce org and locally save login credentials
    org:clear|cl                        [Org] Clear login credentials from your PC
    org:which|wh                        [Org] Show stored login credentials
    orch:list|ol                        [Orch] List all orchestration names at your org
    orch:retrieve|or <name>             [Orch] Retreive the specific orchestration metadata as zip file. <name> is orchestration name
    orch:document|oh <name>             [Orch] Create a orchestration, platform events, and referenced object html file. <name> is orchestration name
    orch:upload|ou <meta_zip>           [Orch] Upload an orchestration metadta zip file to your org. <meta_zip> is absolute path of metadata.zip
    orch:backup|ob <name> <new_name>    [Orch] Copy an orchestration to your org with new name. <name> is target orchestration name and <new_name> is new orchestration name as copy
    orch:debuglog|od <name> <new_name>  [Orch] Copy an orchestration with new name and add debug logs to it. <name> is target orchestration name and <new_name> is new orchestration name as copy. Before this command, please install this pacakge at https://goo.gl/Ts1Y8D
    pevent:fire|pf <json_file>          [PEvent] Fire sequentially platfom events based on json file.
    pevent:list|pl                      [PEvent] List all platform events at your org
    pevent:data|pd <name>               [PEvent] Create json file for firing sequentially platform events for test
    stream:event|se <name>              [Stream] Subscribe a platform event. <name> is platform event name
    stream:allevents|sa                 [Stream] Subscribe all platform events
