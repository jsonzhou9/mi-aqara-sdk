const dgram = require('dgram');
const DeviceHelper = require('./DeviceHelper');
const GatewayHelper = require('./GatewayHelper');
const DeviceMapsHelper = require('./DeviceMapsHelper');
const DeviceParser = require('./DeviceParser');
const utils = require('./utils');

const defaultConfig = {
    iv: Buffer.from([0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58, 0x56, 0x2e]),
    multicastAddress: '224.0.0.50',
    multicastPort: 4321,
    serverPort: 9898,
    bindAddress: '' // SDK所在设备具有多网络时需要设置
};

class MiAqara {

    /**
     * @param gateways 网关列表，支持数组或对象
     * @param opts 服务配置信息
     * */
    constructor (gateways, opts) {
        // 服务配置信息
        opts = opts ? Object.assign({}, defaultConfig, opts) : defaultConfig;
        this.multicastAddress = opts.multicastAddress;
        this.multicastPort = opts.multicastPort;
        this.serverPort = opts.serverPort;
        this.bindAddress = opts.bindAddress;

        // 读取设备计数
        this.readCount = 0;

        // 事件
        this.onReady = opts.onReady;
        this.onMessage = opts.onMessage;

        this.deviceMapsHelper = new DeviceMapsHelper();
        this.gatewayHelper = new GatewayHelper(this);
        this.deviceHelper = new DeviceHelper(this);
        this.parser = DeviceParser;
        this.serverSocket = null;

        if (Array.isArray(gateways)) {
            for (let i=0; i<gateways.length; i++) {
                this.gatewayHelper.addOrUpdate({
                    iv: gateways[i].iv || defaultConfig.iv,
                    sid: gateways[i].sid,
                    password: gateways[i].password
                });
            }
        } else if (utils.isObject(gateways)) {
            this.gatewayHelper.addOrUpdate({
                iv: gateways.iv || defaultConfig.iv,
                sid: gateways.sid,
                password: gateways.password
            });
        } else {
            throw new Error('Param error');
        }
    }

    start () {
        // 初始化SDK
        this.createSocket();
        this.initServerSocket();
        this.sendWhoisCommand();
    }

    createSocket () {
        this.serverSocket = dgram.createSocket({
            type: 'udp4',
            reuseAddr: true
        });
    }

    initServerSocket () {
        this.serverSocket.on('error', function(err){
            console.error('error, msg - %s, stack - %s\n', err.message, err.stack);
        });

        this.serverSocket.on('listening', function(){
            let server = this.address()
            console.info(`server is listening on port ${server.port}.`);
        });

        this.serverSocket.on('message', this.parseMessage.bind(this));

        this.serverSocket.bind(this.serverPort, () => {
            this.serverSocket.addMembership(this.multicastAddress);
        });
    }

    parseMessage (msg, rinfo) {
        let data;
        try {
            data = JSON.parse(msg); // msg is a Buffer
            if (data.hasOwnProperty('data')) {
                data.data = JSON.parse(data.data);
            }
        } catch (e) {
            console.error('Bad message: %s', msg);
            return;
        }
        let cmd = data['cmd'];
        // console.log('[Message] cmd: %s, msg: ', cmd, msg.toString());

        if (cmd === 'iam') { // whois callback
            this.gatewayHelper.uploadBySid(data.sid, data);
            this.gatewayHelper.getIdList(data.sid); // 更新子设备列表
        } else if(cmd === 'get_id_list_ack') { // get_id_list callback
            this.gatewayHelper.uploadBySid(data.sid, data);
            this.deviceMapsHelper.addOrUpdate(data.sid, data.data); // 更新网关与子设备的映射关系
            this.deviceHelper.readAll(data.data); // 批量读取子设备详细信息
            this.readCount += data.data.length;
        } else if (cmd === 'report') { // 设备状态上报
            this._addOrUpdate(data);
        } else if (cmd === 'read_ack') { // read callback
            this._addOrUpdate(data);
            this.readCount--;
            if (this.readCount === 0) { // 所有设备读取完毕，触发onRead事件
                this.onReady && this.onReady(data);
            }
        } else if (cmd === 'write_ack') { // write callback
            this._addOrUpdate(data);
        } else if(cmd === 'server_ack') { // 网关通用回复, 如发送报文JSON解析出错，会回复此事件
            console.error('server ack: %s', msg);
        } else if (cmd === 'heartbeat') {  // 心跳包
            /**
             * 网关每10秒钟发送一次, 主要更新网关token
             * 子设备心跳，插电设备10分钟发送一次，其它1小时发送一次
             * */
            this._addOrUpdate(data);
        }

        this.onMessage && this.onMessage(data);
    }

    _addOrUpdate (data) {
        if (!data) {
           return;
        }
        if (data['model'] === 'gateway') { // 网关
            this.gatewayHelper.uploadBySid(data.sid, data);
        } else { // 子设备
            this.deviceHelper.addOrUpdate(data);
        }
    }

    /**
     * 消息发送
     * @param {String} ip
     * @param {String} port
     * @param {Object} msg 消息对象
     * */
    send (ip, port, msg) {
        if (!ip || !port || !msg) {
            throw new Error('Param error');
        }
        let msgStr = utils.messageFormat(msg);
        console.log("[Send] msg: %s", msgStr);
        this.serverSocket.send(msgStr, 0, msgStr.length, port, ip);
    }

    /**
     * 网关设备发现（设备发现不加密）
     * 组播方式
     * */
    sendWhoisCommand () {
        this.send(this.multicastAddress, this.multicastPort, {
            cmd: 'whois'
        });
    }
}

module.exports = MiAqara;