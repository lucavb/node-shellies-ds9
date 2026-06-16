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
- Shelly 1L Gen3

This fork is specifically maintained for Homebridge compatibility where these devices are essential.

## Installation

```bash
npm install @lucavb/shellies-ds9
```

## About

Handles communication with the next generation of Shelly devices.

## Supported devices

- [Shelly Plus 1 + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus1)
- [Shelly 1L Gen3](https://kb.shelly.cloud/knowledge-base/shelly-1l-gen3)
- [Shelly Plus 1 PM + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus1PM)
- [Shelly Plus 1 Mini + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus1)
- [Shelly Plus 1 PM Mini + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus1PM)
- [Shelly Plus PM Mini + V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusPMMini)
- [Shelly Plus 2 PM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus2PM)
- [Shelly 2PM Gen3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/Shelly2PMG3)
- [Shelly Plus I4 +V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusI4)
- [Shelly Plus I4 DC](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusI4DC)
- [Shelly Plus Plug S](https://kb.shelly.cloud/knowledge-base/shelly-plus-plug-s-1)
- [Shelly Plus Plug US](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlugUS)
- [Shelly Plus Plug UK](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusPlugUK)
- [Shelly Plus Plug IT](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusPlugIT)
- [Shelly Plus H&T +V3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusHT)
- [Shelly Plus 0-10V Dimmer](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlus10V)
- [Shelly Plug S Gen3 EU](https://kb.shelly.cloud/knowledge-base/shelly-plug-s-mtr-gen3)
- [Shelly AZ Plug Gen3](https://kb.shelly.cloud/knowledge-base/shelly-az-plug-gen3)
- [Shelly Outdoor Plug S Gen3](https://kb.shelly.cloud/knowledge-base/shelly-outdoor-plug-s-gen3)
- [Shelly Plug M Gen3](https://kb.shelly.cloud/knowledge-base/shelly-plug-m-gen3)
- [Shelly Plug PM Gen3](https://kb.shelly.cloud/knowledge-base/shelly-plug-pm-gen3)
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
- [Shelly 1 Gen4](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/Shelly1G4)
- [Shelly 1PM Gen4](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/Shelly1PMG4)
- [Shelly 2PM Gen4](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/Shelly2PMG4)
- [Shelly 1 Gen4 ANZ](https://kb.shelly.cloud/knowledge-base/shelly-1-gen4-anz)
- [Shelly 1PM Gen4 ANZ](https://kb.shelly.cloud/knowledge-base/shelly-1pm-gen4-anz)
- [Shelly 2PM Gen4 ANZ](https://kb.shelly.cloud/knowledge-base/shelly-2pm-gen4-anz)
- [Shelly 1 Mini Gen4](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/ShellyMini1G4)
- [Shelly 1 PM Mini Gen4](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/ShellyMini1PMG4/)
- [Shelly Plug US Gen4](https://kb.shelly.cloud/knowledge-base/shelly-plug-us-gen4)
- [Shelly Power Strip 4 Gen4](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/ShellyPowerStripG4/)

## Outbound WebSocket server

Devices can dial into your Node process instead of requiring inbound LAN access — useful for NAT, battery-powered devices, and fleets.

Install the server entry point separately from the main client API:

```typescript
import { ShellyOutboundServer } from '@lucavb/shellies-ds9/server';

const server = new ShellyOutboundServer({ port: 7011, path: '/shelly' });

server.on('device', async (device) => {
    console.log(`Device connected: ${device.id} (${device.modelName})`);
    await device.switch0.toggle();
});

server.on('disconnect', (deviceId, code, reason) => {
    console.log(`Device disconnected: ${deviceId} (${code}: ${reason})`);
});

await server.listen();
```

Configure a Shelly device to connect outbound (via inbound RPC or the device web UI):

```typescript
await device.outboundWebSocket.setConfig({
    enable: true,
    server: 'ws://your-server:7011/shelly', // or wss:// for TLS
    ssl_ca: '*', // use 'user_ca.pem' + upload CA for self-signed TLS
});
// Ws.SetConfig returns restart_required: true — reboot the device after saving
```

TLS example:

```typescript
import fs from 'fs';
import { ShellyOutboundServer } from '@lucavb/shellies-ds9/server';

const server = new ShellyOutboundServer({
    port: 7011,
    path: '/shelly',
    tls: {
        cert: fs.readFileSync('cert.pem'),
        key: fs.readFileSync('key.pem'),
    },
});
```

Common server URLs:

| Deployment                  | URL                            |
| --------------------------- | ------------------------------ |
| This library (default path) | `ws://host:7011/rpc`           |
| Shelly Fleet Manager style  | `ws://host:7011/shelly`        |
| Home Assistant style        | `ws://host:8123/api/shelly/ws` |

When a device reconnects, the server emits `disconnect` then a new `device` event with a fresh `Device` instance.

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

## Generic / unsupported devices

By default, unrecognized model strings are ignored and an `unknown` event is emitted. You can opt in to **generic device** support so Gen2+ hardware is discovered and controlled without a typed device class:

```typescript
import { GenericDevice, isGenericDevice, MdnsDeviceDiscoverer, Shellies } from '@lucavb/shellies-ds9';

const shellies = new Shellies({ genericDevices: true });

shellies.on('unknown', (deviceId, model, identifiers, willAddGeneric) => {
    if (willAddGeneric) {
        console.log(`Unknown model ${model} (${deviceId}) — will add as generic device`);
    } else {
        console.log(`Unknown model ${model} (${deviceId}) — ignored`);
    }
});

shellies.on('add', async (device) => {
    if (isGenericDevice(device)) {
        const sw = device.get('switch:0');
        sw.on('change:output', (on) => console.log('switch output:', on));
        await device.call('Switch.Toggle', { id: 0 });
    }
});

// manual path
const device = await shellies.addGeneric(info, rpcHandler);
```

When `genericDevices` is enabled:

- Components are discovered at runtime via `Shelly.GetComponents`
- Known component keys (`switch:0`, `cover:0`, etc.) use the same typed component classes as registered devices
- Unknown component types are exposed as dynamic proxies with `change` events and `call()` RPC access
- The `unknown` event includes a `willAddGeneric` flag: `true` when a `GenericDevice` `add` follows, `false` when the device is ignored

`genericDevices` defaults to `false` today and may default to `true` in a future major release.

## Credits

This fork builds upon the excellent work of:

- **[imuab](https://github.com/imuab)** - Maintained the [upstream fork](https://github.com/imuab/node-shellies-ds9) that this is based on
- **[Alexander Rydén](https://github.com/alexryd)** - Original [node-shellies](https://github.com/alexryd/node-shellies) author

Special thanks to the Shelly community and all contributors who have made this ecosystem possible.
