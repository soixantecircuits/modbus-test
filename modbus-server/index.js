require('dotenv').config()

const controllerState = { use: false, tablette_id: 0, product_id: 0}
//create the register
let register = Array.from({
		length: 33,
		//general
		0: 0,
		//conveyor 1
		1: 0,		// 0, 1, 2, 3
		2: 0, 
		3: 1,	// 1, 2, 3
		4: 0,		// 0 to 100
		//conveyor 2
		7: 0,		// 0, 1, 2, 3
		8: 0,
		9: 1,		// 1, 2, 3
		10: 0,	// 0 to 100
		//general
		20: 0,
		21: 0,
		22: 0,
		//conveyor 1
		23: 0,
		24: 0,
		25: 0,
		//conveyor 2
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

// ably call from modbus controller
const controller_channel = ably.channels.get('modBus')
controller_channel.subscribe('run', (message) => {
	console.log('run', message.data)
	if(message.data.convoyeur_id === 1) {
		register[1] = message.data.status
	} else if (message.data.convoyeur_id === 2) {
		register[7] = message.data.status
	}
})

controller_channel.subscribe('position', (message) => {
	console.log('position', message.data)
	if(message.data.convoyeur_id === 1) {
		register[2] = message.data.position
	} else if (message.data.convoyeur_id === 2) {
		register[8] = message.data.position
	}
})

controller_channel.subscribe('post_id', (message) => {
	console.log('post_id', message.data)
	if(message.data.convoyeur_id === 1) {
		register[3] = message.data.post_id
	} else if (message.data.convoyeur_id === 2) {
		register[9] = message.data.post_id
	}
})
controller_channel.subscribe('speed', (message) => {
	console.log('speed', message.data)

	if(message.data.convoyeur_id === 1) {
		register[4] = message.data.speed
	} else if (message.data.convoyeur_id === 2) {
		register[10] = message.data.speed
	}
})

// ably call from app
const app_channel = ably.channels.get('flying-polo');

app_channel.subscribe('polo-capture', (message) => {
	console.log('polo-capture', message.data.tablette_id)
  if (controllerState.use === false) {
    controllerState.tablette_id = message.data.tablette_id
    controllerState.use = true
		app_channel.publish('access-granted', {tablette_id: message.data.tablette_id })
  }
})

app_channel.subscribe('polo-free', (message) => {
  if(controllerState.use === true && controllerState.tablette_id === message.data.tablette_id) {
    tablette_id = 0
    controllerState.use = false
    app_channel.publish('polo-idle', null)
    console.log('polo_free')
  }
})

app_channel.subscribe('ask-state', (message) => {
  console.log('ask-state')
  app_channel.publish('state', { tablette_id: message.data.tablette_id, state: controllerState})
})

app_channel.subscribe('ask-polo', (message) => {
  console.log('ask-polo', message.data)
	if(controllerState.use === true && controllerState.tablette_id === message.data.tablette_id) {
		app_channel.publish('polo-start-rotate', { tablette_id: message.data.tablette_id, product_id: message.data.product_id } )
		controllerState.product_id = message.data.product_id
		setTimeout(() => {
			app_channel.publish('polo-stop-rotate', {tablette_id: message.data.tablette_id, product_id: message.data.product_id})
			controllerState.product_id = 0
		}, 5000)
	}
})

serverTCP.on("socketError", function (err) {
	// Handle socket error if needed, can be ignored
	console.error(err)
})