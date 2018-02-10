/**
 * 网关辅助类
 * 管理多个网关
 */
const Gateway = require('./Gateway');
const utils = require('./utils');

class GatewayHelper {
    constructor (platform) {
        if (!platform) {
            throw new Error('[GatewayHelper:constructor] Param error');
        }
        this.gateways = {}; // 网关列表，sid->Gateway
        this.platform = platform;
    }

    /**
     * 添加
     * */
    add (gateway) {
        if (!gateway || !gateway.sid || this.gateways.hasOwnProperty(gateway.sid)) {
            return;
        }
        this.gateways[gateway.sid] = gateway;
    }

    addOrUpdate (data) {
        let sid = data.sid;
        if (this.gateways.hasOwnProperty(sid)) {
            let gateway = this.gateways[sid];
            gateway.update(data);
        } else {
            this.gateways[sid] = new Gateway(data);
        }
    }

    /**
     * 移除
     * */
    remove (sid) {
        delete this.gateways[sid];
    }

    /**
     * 根据sid查找网关
     **/
    getBySid (sid) {
        return this.gateways[sid];
    }

    /**
     * 根据sid更新网关的属性
     * */
    uploadBySid (sid, data) {
        if (this.gateways.hasOwnProperty(sid)) {
            let gateway = this.gateways[sid];
            gateway.update(data);
        }
    }

    /**
     * 获取网关列表数组
     * */
    getGatewayList () {
        let list = [];
        for (let key in this.gateways) {
            let value = this.gateways[key];
            list.push(value);
        }
        return list;
    }

    getAll () {
        return this.gateways;
    }

    /**
     * 查询子设备id列表
     * */
    getIdList (sid) {
        console.log('[GatewayHelper:getIdList] sid:%s', sid);
        let gateway = this.getBySid(sid);
        if (gateway) {
            this.platform.send(gateway.ip, gateway.port, {
                cmd: 'get_id_list'
            });
        } else {
            console.error('[GatewayHelper:getIdList] sid:%s is not exit', sid);
        }
    }

    /**
     * 读设备
     *
     * @param {String} sid 网关设备ID
     * */
    read (sid) {
        console.log('[GatewayHelper:read] sid=%s', sid);
        let gateway = this.getBySid(sid);
        if (gateway) {
            this.platform.send(gateway.ip, gateway.port, {
                cmd: 'read',
                sid: sid
            });
        } else {
            console.error('[GatewayHelper:read] sid:%s can not find gateway', sid);
        }
    }

    /**
     * 写设备
     *
     * @param {String} sid 网关设备ID
     * @param {Object} data 写入网关的数据
     * */
    write (sid, data) {
        console.log('[GatewayHelper:write] sid=%s', sid);
        let gateway = this.getBySid(sid);
        if (gateway) {
            let msg = {
                cmd: 'write',
                model: 'gateway',
                sid: gateway.sid,
                data: Object.assign({}, data)
            };
            // 加密串
            msg.data.key = utils.cipher(gateway.token, gateway.password, gateway.iv);
            this.platform.send(gateway.ip, gateway.port, msg);
        } else {
            console.error('[GatewayHelper:read] sid:%s can not find', sid);
        }
    }

    /**
     * 控制网关彩灯
     * HSB颜色模式
     * @param sid 网关设备ID
     * @param {Boolean} power 开关
     * @param hue 色相
     * @param saturation 饱和度
     * @param brightness 亮度
     * */
    controlLight({sid, power, hue, saturation, brightness}) {
        let prepValue = 0;
        if(power) {
            if(!hue) {
                hue = 0;
            }
            if(!saturation) {
                saturation = 0 * 100;
            }
            if(!brightness) {
                brightness = 50;
            }
            let rgb = utils.hsb2rgb([hue, saturation/100, 1]);
            prepValue = parseInt(utils.dec2hex(brightness, 2) + utils.dec2hex(rgb[0], 2) + utils.dec2hex(rgb[1], 2) + utils.dec2hex(rgb[2], 2), 16);
        }
        this.write(sid, {rgb: prepValue});
    }
}

module.exports = GatewayHelper;