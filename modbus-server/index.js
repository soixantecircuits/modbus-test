require('dotenv').config()

//create the register
let register = Array.from({
		length: 33,
		//general
		0: 0,
		//convoyeur 1
		1: 0,		// 0, 1, 2, 3
		2: 0, 
		3: 0,	// 1, 2, 3
		4: 0,		// 0 to 100
		//convoyeur 2
		7: 0,		// 0, 1, 2, 3
		8: 0,
		9: 1,		// 1, 2, 3
		10: 10,	// 0 to 100
		//general
		20: 0,
		21: 0,
		22: 0,
		//convoyeur 1
		23: 0,
		24: 0,
		25: 0,
		//convoyeur 2
		28: 0,
		29: 0,
		30: 0
	})

// create an empty modbus client
const ModbusRTU = require("modbus-serial")
const vector = {
	getInputRegister: function (addr, unitID) {
		// Synchronous handling
		return addr
	},
	getHoldingRegister: function (addr, unitID, callback) {
		// Asynchronous handling (with callback)
		setTimeout(function () {
			// callback = function(err, value)
			callback(null, register[addr])
		}, 10)
	},
	getCoil: function (addr, unitID) {
		// Asynchronous handling (with Promises, async/await supported)
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve((addr % 2) === 0)
			}, 10)
		})
	},
	setRegister: function (addr, value, unitID) {
		// Asynchronous handling supported also here
		console.log("set register", addr, value, unitID)
		register[addr] = value
		return
	},
	setCoil: function (addr, value, unitID) {
		// Asynchronous handling supported also here
		callback(null, addr + 2000)
		console.log("set coil", addr, value, unitID)
		return
	},
	readDeviceIdentification: function (addr) {
		return {
			0x00: "MyVendorName",
			0x01: "MyProductCode",
			0x02: "MyMajorMinorRevision",
			0x05: "MyModelName",
			0x97: "MyExtendedObject1",
			0xAB: "MyExtendedObject2"
		}
	}
}

// set the server to answer for modbus requests
console.log(`ModbusTCP listening on modbus://${process.env.HOST}:${process.env.PORT}` )
const serverTCP = new ModbusRTU.ServerTCP(vector, { host: process.env.HOST, port: process.env.PORT, debug: true, unitID: 1 })

// connect to Ably
const Ably = require('ably')
const ably = new Ably.Realtime(process.env.ABLY_KEY)
ably.connection.on('connected', () => {
  console.log('Connected to Ably!');
});
const channel = ably.channels.get('modBus')

channel.subscribe('run', (message) => {
	console.log('run', message.data)
	if(message.data.convoyeur_id === 1) {
		register[1] = message.data.status
	} else if (message.data.convoyeur_id === 2) {
		register[7] = message.data.status
	}
})

channel.subscribe('position', (message) => {
	console.log('position', message.data)
	if(message.data.convoyeur_id === 1) {
		register[2] = message.data.position
	} else if (message.data.convoyeur_id === 2) {
		register[8] = message.data.position
	}
})

channel.subscribe('post_id', (message) => {
	console.log('post_id', message.data)
	if(message.data.convoyeur_id === 1) {
		register[3] = message.data.post_id
	} else if (message.data.convoyeur_id === 2) {
		register[9] = message.data.post_id
	}
})
channel.subscribe('speed', (message) => {
	console.log('speed', message.data)

	if(message.data.convoyeur_id === 1) {
		register[4] = message.data.speed
	} else if (message.data.convoyeur_id === 2) {
		register[10] = message.data.speed
	}
})

serverTCP.on("socketError", function (err) {
	// Handle socket error if needed, can be ignored
	console.error(err)
})