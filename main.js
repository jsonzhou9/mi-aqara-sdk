const MiAqara = require('./mi-skd');
const CosmosDB = require('./cosmosdb');
const config = require('./config');

function generateId(info) {
    let result = "";
    ["building", "floor", "side", "gender", "number"].forEach(function (item) {
        if (info.hasOwnProperty(item)) {
            result += info[item];
        }
        else {
            result += "-";
        }
    })
    return result;
}

function getDeviceInfo(msg) {
    const deviceInfo = config.devices.find(function (device) {
        return device.sid === msg['sid'];
    });
    if (!!deviceInfo) {
        return deviceInfo;
    }
    return { id: msg["sid"] };
}

MiAqara.create(config.gateways, {
    onReady(msg) {
        console.log('onReady', JSON.stringify(msg));
    },
    onMessage(msg) {
        if (!msg) {
            return;
        }
        console.debug("message:", JSON.stringify(msg));
        if (msg['model'] === 'magnet') {
            let info = getDeviceInfo(msg);
            info["id"] = generateId(info);
            info["status"] = msg["data"]["status"] === "open";
            Object.assign(msg, info);
            console.log("update to cosmosdb", JSON.stringify(msg));
            CosmosDB.CreateOrUpdateItem(msg);
        }
    }
});

MiAqara.start();
setInterval(() => {
    MiAqara.refresh();
}, 20000)