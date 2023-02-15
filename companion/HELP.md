## OREI Quad Multi-Viewer
This module controls an OREI HDMI 4x1 Quad Multi-Viewer HD-401MR. <a href="https://www.orei.com/products/orei-quad-multi-viewer-4x1-hdmi-switcher-4-ports-seamles-switch-and-ir-remote-support-1080p-for-ps4-pc-stb-dvd-hd-401mr" title="HD-401MR">HD-401MR</a> 

### This switcher:
  * scales and re-syncs inputs to 1080p or 720p
  * gives a consistent signal to source devices even in standby
  * instant switching between inputs

The HD-401MR uses a serial (RS-232) port for remote control. To access this from Companion you will need a device or software to provice a TCP connection to the serial port.<br>

If the device is near the companion computer, look for the `generic-ip-serial` helper module which should work with a USB to serial port adapter.<br>

You can also use a device such as the Global Cache `itac-sl` or the USR IOT `USR-TCP232-302` 


## Configuration
Setting | Description
-----------------|---------------
**IP Address** | Enter the IP Address of the TCP interface
**IP Port** | Enter the IP Port number of the interface server

### Available Actions
Command | Description
------|------
Power | Device Power: On or Off (standby)
OSD | On Screen Display: On or Off
OSL | On Screen Split Line: On or Off
OutRes | Output Resolution: 720p@60 or 1080p@60
FS | Full Screen Mode: (Input 1 to 4)
2X | Dual Screen Mode: (1+2 or 3+4)
1X3 | 1 large 3 small Mode: (Large input 1 to 4)
HQuad | H Quad mode 
Quad | Quad Split Mode
VIn | Select video input <su>*</su>
AIn | Select audio input <su>**</su>
AMute | Mute Audio

<su>*</su> Not available on HQuad or Quad. In 2X mode, changes between 1+2 or 3+4<br>
<su>**</su> Only switches visible inputs