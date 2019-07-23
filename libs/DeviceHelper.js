/**
 * 子设备 & 传感器设备辅助类
 * */
const Device = require('./Device');
const utils = require('./utils');

class DeviceHelper {
    constructor (platform) {
        if (!platform) {
            throw new Error('[DeviceHelper:constructor] Param error');
        }
        this.devices = {};
        this.platform = platform;
    }

    add (device) {
        if (!device || !device.sid || this.devices.hasOwnProperty(device.sid)) {
            return;
        }
        this.devices[device.sid] = device;
    }

    addOrUpdate (data) {
        if (!data) {
            console.log('[DeviceHelper:addOrUpdate] data is null');
            return;
        }
        let sid = data.sid;
        if (this.devices.hasOwnProperty(sid)) {
            let device = this.devices[sid];
            device.update(data);
        } else {
            this.devices[sid] = new Device(data);
        }

        let nameInfo = this.platform.parser.getNameByModel(data.model);
        if (nameInfo) {
            this.devices[sid].name = nameInfo.name;
            this.devices[sid].name_cn = nameInfo.name_cn;
        }
    }

    remove (sid) {
        delete this.devices[sid];
    }

    uploadBySid (sid, data) {
        if (this.devices.hasOwnProperty(sid)) {
            let device = this.devices[sid];
            device.update(data);
        }
    }

    getBySid (sid) {
        return this.devices[sid];
    }

    /**
     * 根据网关设备ID，查找子设备列表
     * */
    getDevicesByGatewaySid (gatewaySid) {
        let deviceMapsHelper = this.platform.deviceMapsHelper;
        let deviceList = [];
        let deviceIds = deviceMapsHelper.getDeviceSids(gatewaySid);
        if (deviceIds) {
            for (let i=0; i<deviceIds.length; i++) {
                let sid = deviceIds[i];
                if (this.devices.hasOwnProperty(sid)) {
                    deviceList.push(this.devices[sid]);
                }
            }
        }
        return deviceList;
    }

    /**
     * 根据网关设备ID及子设备型号，查找子设备列表
     * @param {String} gatewaySid
     * @param {String} model
     * */
    getDevicesByGatewaySidAndModel (gatewaySid, model) {
        let deviceList = this.getDevicesByGatewaySid(gatewaySid);
        let newDeviceList = [];
        for (let i=0; i<deviceList.length; i++) {
            if (model === deviceList[i].model) {
                newDeviceList.push(deviceList[i]);
            }
        }
        return newDeviceList;
    }

    /**
     * 根据子设备型号获取子设备列表
     * */
    getDevicesByModel (model) {
        let deviceList = [];
        for (let sid in this.devices) {
            if (model === this.devices[sid].model) {
                deviceList.push(this.devices[sid]);
            }
        }
        return deviceList;
    }

    refresh(){
        for(let key in this.devices){
            this.read(key)
        }
    }

    getDeviceList () {
        let deviceList = [];
        for (let key in this.devices) {
            let value = this.devices[key];
            deviceList.push(value);
        }
        return deviceList;
    }

    getAll () {
        return this.devices;
    }

    /**
     * 读设备
     *
     * @param {String} sid 子设备ID
     * */
    read (sid) {
        console.log('[DeviceHelper:read] sid=%s', sid);
        let deviceMapsHelper = this.platform.deviceMapsHelper;
        let gatewaySid = deviceMapsHelper.getGatewaySidByDeviceSid(sid);
        let gatewayHelper = this.platform.gatewayHelper;
        if (gatewaySid) {
            let gateway = gatewayHelper.getBySid(gatewaySid);
            if (gateway) {
                this.platform.send(gateway.ip, gateway.port, {
                    cmd: 'read',
                    sid: sid
                });
            }
        } else {
            console.error('[DeviceHelper:read] sid:%s can not find gateway', sid);
        }
    }

    /**
     * 批量读取
     * */
    readAll (sidList) {
        console.log('[DeviceHelper:readAll] sidList=%s', sidList);
        if (!sidList || sidList.length === 0) {
            return;
        }
        for (let i=0; i<sidList.length; i++) {
            this.read(sidList[i]);
        }
    }

    /**
     * 写设备
     *
     * @param {String} sid 子设备ID
     * */
    write (sid) {
        console.log('[DeviceHelper:write] sid=%s', sid);
        let device = this.getBySid(sid);
        let deviceMapsHelper = this.platform.deviceMapsHelper;
        let gatewaySid = deviceMapsHelper.getGatewaySidByDeviceSid(sid);
        let gatewayHelper = this.platform.gatewayHelper;
        if (device && gatewaySid) {
            let gateway = gatewayHelper.getBySid(gatewaySid);
            if (gateway) {
                let msg = {
                    cmd: 'write',
                    model: device.model,
                    sid: device.sid,
                    short_id: device.short_id,
                    data: Object.assign({}, device.data)
                };
                // 加密串
                msg.data.key = utils.cipher(gateway.token, gateway.password, gateway.iv);
                this.platform.send(gateway.ip, gateway.port, msg);
            }
        } else {
            console.error('[DeviceHelper:read] sid:%s can not find', sid);
        }
    }

    /**
     * 改变子设备状态
     * */
    change ({sid, gatewaySid, model, data}) {
        console.log('[DeviceHelper:change] sid=%s', sid);
        if (!data || !utils.isObject(data)) {
            console.error('[DeviceHelper:change] Param error');
            return;
        }
        if (sid) { // 改变指定设备状态
            let device = this.getBySid(sid);
            if (!device) {
                console.error('[DeviceHelper:change] sid=%s, can not found', sid);
                return;
            }
            device.data = data;
            this.write(sid);
        } else if (gatewaySid && model) {
            let devices = this.getDevicesByGatewaySidAndModel(gatewaySid, model);
            for (let i=0; i<devices.length; i++) {
                devices[i].data = data;
                this.write(devices[i].sid);
            }
        } else if (model) {
            let devices = this.getDevicesByModel(model);
            for (let i=0; i<devices.length; i++) {
                devices[i].data = data;
                this.write(devices[i].sid);
            }
        } else {
            console.error('[DeviceHelper:change] Param error');
        }
    }

}

module.exports = DeviceHelper;