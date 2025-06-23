# node-shellies-ds9

[![npm version](https://img.shields.io/npm/v/@lucavb/shellies-ds9.svg?style=flat-square)](https://www.npmjs.com/package/@lucavb/shellies-ds9)
[![npm downloads](https://img.shields.io/npm/dm/@lucavb/shellies-ds9.svg?style=flat-square)](https://www.npmjs.com/package/@lucavb/shellies-ds9)
[![license](https://img.shields.io/npm/l/@lucavb/shellies-ds9.svg?style=flat-square)](https://github.com/lucavb/node-shellies-ds9/blob/main/LICENSE)

## About This Fork

This is a **fork** of [imuab/node-shellies-ds9](https://github.com/imuab/node-shellies-ds9), created to include device support that wasn't merged upstream.

### Why This Fork Exists

The [imuab repository](https://github.com/imuab/node-shellies-ds9) had a pull request for Shelly Plug S Gen 3 EU support that didn't get merged. This fork includes that support along with additional device compatibility for:

- Shelly Plus 1 Mini
- Shelly Plus 1 PM Mini
- Shelly Plus PM Mini
- Shelly Plug S Gen 3 EU

This fork is specifically maintained for Homebridge compatibility where these devices are essential.

## Installation

```bash
npm install @lucavb/shellies-ds9
```

## About

Handles communication with the next generation of Shelly devices.

## Supported devices

- [Shelly Plus 1 + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus1)
- [Shelly Plus 1 PM + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus1PM)
- [Shelly Plus 1 Mini + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus1)
- [Shelly Plus 1 PM Mini + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus1PM)
- [Shelly Plus PM Mini + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusPMMini)
- [Shelly Plus 2 PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus2PM)
- [Shelly Plus I4 +V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusI4)
- [Shelly Plus Plug S](https://kb.shelly.cloud/knowledge-base/shelly-plus-plug-s-1)
- [Shelly Plus Plug US](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlugUS)
- [Shelly Plus Plug UK](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusPlugUK)
- [Shelly Plus Plug IT](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusPlugIT)
- [Shelly Plus H&T +V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusHT)
- [Shelly Plus 0-10V Dimmer](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus10V)
- [Shelly Plug S Gen3 EU](https://kb.shelly.cloud/knowledge-base/shelly-plug-s-mtr-gen3)
- [Shelly Dimmer 0/1-10V PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyDimmer0110VPMG3)
- [Shelly Dimmer](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyDimmerG3)
- [Shelly Pro 1](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPro1)
- [Shelly Pro 1 PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPro1PM)
- [Shelly Pro 2](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPro2)
- [Shelly Pro 2 PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPro2PM)
- [Shelly Pro 3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPro3)
- [Shelly Pro 4 PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPro4PM)
- [Shelly Pro Dual Cover PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyProDualCoverPM)
- [Shelly Pro Dimmer 1PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyProDimmer1PM)
- [Shelly Pro Dimmer 0/1-10V PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyProDimmer0110VPM)
- [Shelly Pro Dimmer 2PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyProDimmer2PM)

<sup>1</sup> Support for outbound websockets is a work in progress.

## Basic usage example

```typescript
import { Device, DeviceId, MdnsDeviceDiscoverer, Shellies, ShellyPlus1 } from '@lucavb/shellies-ds9';

const shellies = new Shellies();

// handle discovered devices
shellies.on('add', async (device: Device) => {
    console.log(`${device.modelName} discovered`);
    console.log(`ID: ${device.id}`);

    // use instanceof to determine the device model
    if (device instanceof ShellyPlus1) {
        const plus1 = device as ShellyPlus1;

        // toggle the switch
        await plus1.switch0.toggle();
    }
});

// handle asynchronous errors
shellies.on('error', (deviceId: DeviceId, error: Error) => {
    console.error('An error occured:', error.message);
});

// create an mDNS device discoverer
const discoverer = new MdnsDeviceDiscoverer();
// register it
shellies.registerDiscoverer(discoverer);
// start discovering devices
discoverer.start();
```

See [homebridge-shelly-ng]() for a real-world example.

## Credits

This fork builds upon the excellent work of:

- **[imuab](https://github.com/imuab)** - Maintained the [upstream fork](https://github.com/imuab/node-shellies-ds9) that this is based on
- **[Alexander Rydén](https://github.com/alexryd)** - Original [node-shellies](https://github.com/alexryd/node-shellies) author

Special thanks to the Shelly community and all contributors who have made this ecosystem possible.
