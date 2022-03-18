// create an empty modbus client
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();

client.connectTCP("127.0.0.1", { port: 8502 })
	.then(write)
	.then(function () {
		console.log("Connected");
	})
	.catch(function (e) {
		console.log(e.message);
	});

function write() {
	client.setID(1);

	client.writeRegisters(1, [10, 9, 8, -20 + 65535, -10 + 65535])
		.then(function (d) {
			console.log("Write 10, 9, 8, -20, -10 to registers 1 to 5", d);
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