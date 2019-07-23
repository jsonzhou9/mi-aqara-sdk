const MiAqara = require('./index');
const CosmosDB = require('./cosmosdb')
const FileSystem = require("fs");
const Util = require('util');

function generateId(info){
    let result = "";
    ["building", "floor", "side", "gender", "number"].forEach(function(item){
        if (info.hasOwnProperty(item)){
            result += info[item]
        }
        else{
            result += "-"
        }
    })
    return result;
}

const config = JSON.parse(FileSystem.readFileSync("config.json"))
MiAqara.create(config.gateways, {
    onReady (msg) {
        console.log('onReady', JSON.stringify(msg));
    },
    onMessage (msg) {
        if (!msg) {
            return;
         }
         console.debug("message:", JSON.stringify(msg))
         if (msg['model'] === 'magnet'){
            let info = config.devices.hasOwnProperty(msg["sid"]) ? config.devices[msg["sid"]]: {id: msg["sid"]};
            info["id"] = generateId(info)
            info["status"] = msg["data"]["status"] === "open"
            Object.assign(msg, info)
            console.log("update to cosmosdb", JSON.stringify(msg));
            CosmosDB.CreateOrUpdateItem(msg)
         }
    }
}); 
MiAqara.start();
setInterval(() => {
    MiAqara.refresh()
}, 20000)