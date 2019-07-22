const MiAqara = require('./index');
const CosmosDB = require('./cosmosdb')
const FileSystem = require("fs");
const config = JSON.parse(FileSystem.readFileSync("config.json"))
MiAqara.create([{
    sid: '',
    password: ''
}], {
    onReady (msg) {
        console.log('onReady', msg);
    },
    onMessage (msg) {
        if (!msg) {
            return;
         }
         if (msg['model'] === 'magnet'){
            let info = config.hasOwnProperty(msg["sid"]) ? config[msg["sid"]]: {id: msg["sid"]};
            info["status"] = msg["data"]["status"] === "open"
            Object.assign(msg, info)
            console.log("update to cosmosdb", msg.toString());
            CosmosDB.CreateOrUpdateItem(msg)
         }
    }
}); 
MiAqara.start();
setInterval(() => {
    MiAqara.start()
}, 60000)