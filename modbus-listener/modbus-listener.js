// create an empty modbus client
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();
 
// open connection to a tcp line
client.connectTCP("127.0.0.1", { port: 8502 });
client.setID(1);
 
// read the values of 13 registers starting at address 0
// and at address 20 on device number 1. and log the
// values to the console.
setInterval(function() {
    client.readHoldingRegisters(0, 13, function(err, data) {
        console.log('Client --> 2AC', data.data);
    });
    client.readHoldingRegisters(20, 13, function(err, data) {
        console.log('2AC --> Client', data.data);
    });
}, 1000);