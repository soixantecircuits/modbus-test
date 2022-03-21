require('dotenv').config()

// create an empty modbus client
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();
client.setID(1);
let i = 0;

client.connectTCP(process.env.ADDRESS, { port: process.env.PORT })
	.then(write)
	.then(function () {
		console.log("Connected");
	})
	.catch(function (e) {
		console.log(e.message);
	});

function write() {
	
	client.writeRegisters(0, [i++])
		.then(function (d) {
			console.log("Add one  to registers 0 ", d);
		})
		.catch(function (e) {
			console.log(e.message);
		})
		.then(read);
}

function read() {
	// read the values of 13 registers starting at address 0
	// and at address 20 on device number 1. and log the
	// values to the console.
	client.readHoldingRegisters(0, 13, function (err, data) {
		console.log('Client --> 2AC', data.data);
	});
	client.readHoldingRegisters(20, 13, function (err, data) {
		console.log('2AC --> Client', data.data);
	});
}

setInterval(function() {
	write()
}, 1000);