require('dotenv').config()
const xstate = require('xstate')
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
  console.log('Connected to Ably!')
})

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

const capturedState = {
  initial: 'waitingPolo',
  states: {
    waitingPolo: {
      on: {
        ASK_POLO: { 
					target: 'displayPolo',
					actions: ['capturePolo'],
					cond: (context, event) => context.tablette_id === event.tablette_id
				}
      }
    },
    displayPolo: {
				entry: ['startPoloRotate', () => console.log('entry')],
      on: {
        POLO_STOP: {
					target: 'waitingPolo',
					actions: ['freePolo']
				}
      }
    }
  }
}

const controllerState = xstate.createMachine({
	id: 'controller',
	initial: 'waitCapture',
	context: {
		tablette_id: 0,
		product_id: 0
	},
	states: {
		waitCapture: {
			on: {
				CAPTURE: {
					target: 'captured',
					actions: ['captureTablette']
				}
			}
		},
		captured: {
			on: {
				FREE: {
					target: 'waitCapture',
					actions: ['freeTablette']
				}
			},
			...capturedState
		}
	}
},
{
	actions: {
		captureTablette: (context, event) => {
			context.tablette_id = event.tablette_id
			app_channel.publish('access-granted', { tablette_id: context.tablette_id })
		},
		freeTablette: (context) => {
			context.tablette_id = 0
		},
		capturePolo: (context, event) => {
			context.product_id = event.product_id
		},
		freePolo: (context) => {
			context.product_id = 0
		},
		startPoloRotate: (context) => {
			app_channel.publish('polo-start-rotate', { tablette_id: context.tablette_id, product_id: context.product_id })
			console.log('start-rotate')
			setTimeout(() => {
				app_channel.publish('polo-stop-rotate', { tablette_id: context.tablette_id, product_id: context.product_id })
				service.send({ type: 'POLO_STOP' })
				console.log('polo_stop')
			}, 5000)
		}
	}
})

const app_channel = ably.channels.get('flying-polo')
const service = xstate.interpret(controllerState).start()

app_channel.subscribe('polo-capture', (message) => {
	console.log('polo-capture', message.data.tablette_id)
	service.send({ type: 'CAPTURE', tablette_id: message.data.tablette_id })
}) 

app_channel.subscribe('polo-free', (message) => {
  console.log('polo_free')
	service.send({ type: 'FREE' })
})

app_channel.subscribe('ask-state', (message) => {
  console.log('ask-state')
	app_channel.publish('state', { tablette_id: message.data.tablette_id, state: { context: service.state.context, stateValue: service.state.value}})
	console.log({ context: service.state.context, stateValue: service.state.value})
})

app_channel.subscribe('ask-polo', (message) => {
  console.log('ask-polo', message.data)
	service.send({ type: 'ASK_POLO', tablette_id: message.data.tablette_id, product_id: message.data.product_id})
})

serverTCP.on("socketError", function (err) {
	// Handle socket error if needed, can be ignored
	console.error(err)
})