require('dotenv').config();

function get(key, value) {
    if (key in process.env) {
        return process.env[key];
    }
    return value;
}

module.exports = {
    cosmosDB: {
        "endpoint": get('COSMOS_DB_ENDPOINT', ""),
        "key": get('COSMOS_DB_PASSWORD', ""),
        "database": get('COSMOS_DB_NAME', "WCDevice"),
        "container": get('COSMOS_DB_CONTAINER', "XiaomiDeviceData"),
    },
    gateways: [{
        "sid": get('GATEWAY_SID1', ""),
        "password": get('GATEWAY_PASSWORD1', ""),
    }],
    devices: [{
        "sid": get('DEVICE_SID1', ""),
        "building": get('DEVICE_SID1_BULINDG', 1),
        "floor": get('DEVICE_SID1_FLOOR', 1),
        "side": get('DEVICE_SID1_SIDE', 1),
        "gender": get('DEVICE_SID1_GENDER', 1),
        "number": get('DEVICE_SID1_NUMBE', 1),
    }]
};