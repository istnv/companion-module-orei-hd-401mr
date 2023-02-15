/* eslint-disable no-useless-escape */
import { combineRgb, Regex } from '@companion-module/base'
import { runEntrypoint, InstanceBase, InstanceStatus, TCPHelper } from '@companion-module/base'
import { UpgradeScripts } from './upgrades.js'

/**
 * Companion instance class orei-hd-401mr
 * Control module for the OREI HD-401MR HDMI 4x1 Quad Multi-viewer
 *
 * @extends InstanceBase
 * @version 2.0.0
 * @since 2.0.0
 * @author John A Knight, Jr <istnv@istnv.com>
 */
class OQInstance extends InstanceBase {
	/**
	 * Create an instance of the orei-hd-401mr module
	 *
	 * @param {Object} internal - ID and flags
	 * @since 2.0.0
	 */
	constructor(internal) {
		super(internal)

		this.isReady = false
		this.constants()
		this.buildActions()
		this.buildPresets()
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @since 2.0.0
	 */
	destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}
		debug('destroy', this.id)
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @since 2.0.0
	 */
	async init(config) {
		this.applyConfig(config)
	}

	/**
	 * Process an updated configuration array.
	 * called from companion when user changes the configuration
	 *
	 * @param {Object} config - the new configuration
	 * @since 2.0.0
	 */
	async configUpdated(config) {
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}
		this.isReady = false
		this.applyConfig(config)
	}

	/**
	 * Apply new/updated user selections
	 *
	 * @param {Object} config - user configured items
	 */
	applyConfig(config) {
		this.config = config
		this.sendQue = []
		this.init_tcp()
	}

	/**
	 * assign constants for this module
	 *
	 * @since 2.0.0
	 */
	constants() {
		this.CMD_INTERVAL = 200

		this.CHOICE_ONOFF = [
			{ id: '1', label: 'ON' },
			{ id: '0', label: 'OFF' },
		]

		this.CHOICE_RES = [
			{ id: '2', label: '1080p @60hz' },
			{ id: '1', label: '720p @60hz' },
		]

		this.CHOICE_INPUT = [
			{ id: '1', label: 'Input 1' },
			{ id: '2', label: 'Input 2' },
			{ id: '3', label: 'Input 3' },
			{ id: '4', label: 'Input 4' },
		]

		this.CHOICE_DUAL = [
			{ id: '12', label: 'Input 1 & 2' },
			{ id: '34', label: 'Input 3 & 4' },
		]

		this.ICONS_POWER = [this.ICON_POWER_OFF, this.ICON_POWER_ON, this.ICON_POWER_UNKNOWN]

		this.POWER_ALIAS = {
			Pown: 'PWR1',
			Powf: 'PWR0',
		}

		this.COMMANDS = {
			PWR: { label: 'Switcher Power', optdesc: 'Power', noResp: false, pstcat: 'Settings', choices: this.CHOICE_ONOFF },
			OSD: {
				label: 'On Screen Display',
				optdesc: 'OSD',
				noResp: false,
				pstcat: 'Settings',
				choices: this.CHOICE_ONOFF,
			},
			VBX: {
				label: 'On Screen Split Line',
				optdesc: 'OSL',
				noResp: false,
				pstcat: 'Settings',
				choices: this.CHOICE_ONOFF,
			},
			RES: {
				label: 'Output Resolution',
				optdesc: 'OutRes',
				noResp: false,
				pstcat: 'Settings',
				choices: this.CHOICE_RES,
			},
			SMD: { label: 'Full Screen Mode', optdesc: 'FS', noResp: false, pstcat: 'Modes', choices: this.CHOICE_INPUT },
			DMD: { label: 'Dual Mode', optdesc: '2x', noResp: false, pstcat: 'Modes', choices: this.CHOICE_DUAL },
			QMD: { label: '1 x 3 Mode', optdesc: '1x3', noResp: false, pstcat: 'Modes', choices: this.CHOICE_INPUT },
			HMD: { label: 'H Quad Mode', optdesc: 'HQuad', noResp: false, pstcat: 'Modes' },
			QMD0: { label: 'Quad Split Mode', optdesc: 'Quad', noResp: false, pstcat: 'Modes' },
			SWV: { label: 'Select Video Input', optdesc: 'VIn', noResp: true, pstcat: 'Inputs', choices: this.CHOICE_INPUT },
			SWA: { label: 'Select Audio Input', optdesc: 'AIn', noResp: true, pstcat: 'Inputs', choices: this.CHOICE_INPUT },
			SWA0: { label: 'Mute Audio', optdesc: 'AMute', noResp: false, pstcat: 'Inputs' },
		}
	}
	/**
	 * Creates the configuration fields for web config.
	 * called from companion when the config page is shown
	 *
	 * @returns {Array} the config fields
	 * @since 2.0.0
	 */
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Target Port',
				width: 4,
				regex: Regex.PORT,
				default: 60000,
			},
		]
	}

	/**
	 * Setup the actions.
	 *
	 * @since 2.0.0
	 */
	buildActions() {
		let actions = {}
		let cmds = this.COMMANDS

		for (let cmd in cmds) {
			actions[cmd] = {
				name: cmds[cmd].label,
				callback: async (action, context) => {
					this.cueAction(action)
				},
				options: []
			}
			if (cmds[cmd].choices) {
				actions[cmd].options = [
					{
						label: cmds[cmd].optdesc,
						type: 'dropdown',
						id: 'choice',
						default: cmds[cmd].choices[0].id,
						choices: cmds[cmd].choices,
					},
				]
			}
		}
		this.setActionDefinitions(actions)
	}

	/**
	 * build presets for the commands
	 *
	 * @since 2.0.0
	 */
	buildPresets() {
		let presets = []
		let cmds = this.COMMANDS

		for (let cmd in cmds) {
			if (cmds[cmd].choices) {
				let choices = cmds[cmd].choices
				for (let opt in choices) {
					presets.push({
						category: cmds[cmd].pstcat,
						label: `${cmds[cmd].optdesc} ${choices[opt].label}`,
						bank: {
							style: 'png',
							text: `${cmds[cmd].optdesc} ${choices[opt].label}`,
							size: 'auto',
							color: combineRgb(255, 255, 255),
							bgcolor: 0,
						},
						actions: [
							{
								action: cmd,
								options: {
									choice: choices[opt].id,
								},
							},
						],
					})
				}
			} else {
				presets.push({
					category: cmds[cmd].pstcat,
					label: cmds[cmd].optdesc,
					bank: {
						style: 'png',
						text: cmds[cmd].label,
						size: 'auto',
						color: combineRgb(255, 255, 255),
						bgcolor: 0,
					},
					actions: [{ action: cmd }],
				})
			}
		}
		this.setPresetDefinitions(presets)
	}

	/**
	 * set up the TCP socket for communication
	 *
	 * @since 2.0.0
	 */
	init_tcp() {
		// ignore if not configured
		let lastErrCode

		if (!(this.config.host && this.config.port)) return

		this.updateStatus(InstanceStatus.Connecting, 'Connecting')
		this.socket = new TCPHelper(this.config.host, this.config.port)

		this.socket.on('status_change', (status, message) => {
			// this.updateStatus(InstanceStatus.UnknownWarning, message)
		})

		this.socket.on('error', (err) => {
			if (err.code != lastErrCode) {
				this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
				this.log('error', `Network error: ${err.message}`)
				if (this.refreshInterval) clearInterval(this.refreshInterval)
				lastErrCode = err.code
			}
		})

		this.socket.on('end', () => {
			this.updateStatus(InstanceStatus.Disconnected, 'Closed')
			this.isReady = false
			if (this.queTimer) {
				clearInterval(this.queTimer)
				delete this.queTimer
			}
		})

		this.socket.on('connect', () => {
			this.updateStatus(InstanceStatus.Ok, 'Connected')
			this.isReady = true
			if (this.queTimer) {
				clearInterval(this.queTimer)
			}
			this.queTimer = setInterval(() => {
				this.checkQueue()
			}, this.CMD_INTERVAL)
		})

		// separate buffered stream into lines with responses
		let receivebuffer = ''
		this.socket.on('data', (chunk) => {
			let i,
				line = '',
				offset = 0

			receivebuffer += chunk

			// this device terminates responses with linefeed
			while ((i = receivebuffer.indexOf('\n', offset)) !== -1) {
				line = receivebuffer.substr(offset, i - offset)
				offset = i + 1
				if (line.length > 0) {
					this.socket.emit('receiveline', line.toString())
				}
			}

			receivebuffer = receivebuffer.substr(offset)
		})

		this.socket.on('receiveline', (line) => {
			let cmd = line.slice(0, 3)
			let opt = line.slice(-1)
			let resp = cmd + opt

			// 'PWR' commands return 'Power On/Off'
			if ((line = this.POWER_ALIAS[cmd + opt])) {
				resp = line
				cmd = line.slice(0, 3)
				opt = line.slice(-1)
			}
			// check for 3 letter command
			if (!['0', '1', '2', '3', '4'].includes(opt)) {
				resp = cmd
				opt = ''
			}
			debug('COM: ', resp)

			if (this.sendQue && this.sendQue.length > 0) {
				let scmd = this.sendQue[0].slice(0, 3)
				// if the 'next' command has unreliable (no) response
				// or this response is for the next command
				// remove it from the 'waiting' for response que
				if ((this.COMMANDS[scmd] && this.COMMANDS[scmd].noResp) || this.sendQue[0] == resp) {
					this.sendQue.shift()
					if (this.sendQue.length > 0) {
						this.sendIt(this.sendQue[0])
					} else {
						this.lastCmd = ''
					}
				}
			} else {
				this.lastCmd = ''
			}
			// update feedback/variables here
			return
		})
	}

	/**
	 * The device seems to get confused and ignores multiple commands
	 * sent too fast. This is not much of a problem pressing single action keys.
	 * Adding multiple actions to a single 'startup' key
	 * (Power on, OSD off, OSL off, Res 1080) will hang.
	 * So we wait until a reponse from the last command before
	 * sending the next one.
	 *
	 * If the send/wait que is empty, send command immediately
	 * otherwise add this command to the end of the cue
	 *
	 * @param {string} cmd - control command to send
	 * @since 2.0.0
	 */
	cueCmd(cmd) {
		if (this.sendQue.length == 0) {
			this.sendIt(cmd)
		}
		this.sendQue.push(cmd)
	}

	/**
	 * Actually transmit a command
	 *
	 * @since 2.0.0
	 */
		sendIt(cmd) {
		// new command or a retry?
		if (this.lastCmd != cmd) {
			this.lastCmdTries = 1
			this.lastCmdAt = Date.now()
		}
		this.socket.send(cmd + '\r\n', (err) => this.sendError(err))
		this.lastCmd = cmd
	}

	/**
	 * timer driven queue check
	 * if the last command din't respond,
	 * send it again
	 */
	checkQueue() {
		if (this.sendQue && this.lastCmd && this.lastCmd != '') {
			let now = Date.now()
			// early retry?
			if (this.lastCmdAt + this.CMD_INTERVAL > now) {
				return
			}
			// try to send a few times, otherwise move on
			if (this.lastCmdTries++ < 5) {
				this.sendIt(this.lastCmd)
			} else {
				this.sendQue.shift()
				if (this.sendQue.length > 0) {
					this.sendIt(this.sendQue[0])
				} else {
					this.lastCmd = ''
					this.lastCmdTries = 1
				}
			}
		}
	}

	/**
	 * Notify if TCP error occurs
	 *
	 * @since 2.0.0
	 */
	sendError(err) {
		if (err) {
			this.updateStatus(InstanceStatus.ConnectionFailure, err)
			debug('TCP write error', err)
		}
	}

	/**
	 * Process/execute the provided action.
	 * called from companion when requested from
	 * a button press, release, step, or trigger
	 *
	 * @param {Object} action - the action (with options) to be executed
	 * @since 2.0.0
	 */
	cueAction(action) {
		// abort if not configured or connected
		if (!this.isReady) return

		let opt = action.options
		let cmd = action.actionId

		// attach user selection to command
		if (opt) {
			cmd += opt.choice
		}

		if (cmd != '') {
			this.cueCmd(cmd)
		}
	}
}

runEntrypoint(OQInstance, UpgradeScripts)

