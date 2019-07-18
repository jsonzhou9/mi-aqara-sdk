const MiAqara = require('mi-aqara-sdk');
MiAqara.create([{
    sid: '04cf8c8f8723',
    password: ''
}], {
    onReady (msg) {
        console.log('onReady', msg);
    },
    onMessage (msg) {
        console.log('onMessage', msg);
    }
}); 
MiAqara.start(); 