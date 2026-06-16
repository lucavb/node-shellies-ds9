import { Device } from '../devices/base';
import { ShellyComponentInfo } from '../services';
import { BluetoothLowEnergy } from './bluetooth-low-energy';
import { Component, ComponentLike } from './base';
import { Cloud } from './cloud';
import { Cover } from './cover';
import { DevicePower } from './device-power';
import { DynamicComponent } from './dynamic';
import { Ethernet } from './ethernet';
import { HtUi } from './ht-ui';
import { Humidity } from './humidity';
import { Input } from './input';
import { Light } from './light';
import { ParsedComponentKey, parseComponentKey } from './key-mapping';
import { Mqtt } from './mqtt';
import { OutboundWebSocket } from './outbound-websocket';
import { Switch } from './switch';
import { Temperature } from './temperature';
import { Ui } from './ui';
import { WiFi } from './wifi';

function createFunctionalComponent(device: Device, parsed: Extract<ParsedComponentKey, { kind: 'functional' }>) {
    switch (parsed.type) {
        case 'switch':
            return new Switch(device, parsed.id);
        case 'cover':
            return new Cover(device, parsed.id);
        case 'light':
            return new Light(device, parsed.id);
        case 'input':
            return new Input(device, parsed.id);
        default: {
            const _exhaustive: never = parsed.type;
            return _exhaustive;
        }
    }
}

function createServiceComponent(
    device: Device,
    parsed: Extract<ParsedComponentKey, { kind: 'service' }>,
): ComponentLike {
    switch (parsed.key) {
        case 'wifi':
            return new WiFi(device);
        case 'mqtt':
            return new Mqtt(device);
        case 'eth':
            return new Ethernet(device);
        case 'ble':
            return new BluetoothLowEnergy(device);
        case 'cloud':
            return new Cloud(device);
        case 'ws':
            return new OutboundWebSocket(device);
        case 'ui':
            return new Ui(device);
        case 'devicepower:0':
            return new DevicePower(device, 0);
        case 'humidity:0':
            return new Humidity(device, 0);
        case 'temperature:0':
            return new Temperature(device, 0);
        case 'sys':
            return device.system;
        case 'ht_ui':
            return new HtUi(device);
        default: {
            const _exhaustive: never = parsed.key;
            return _exhaustive;
        }
    }
}

function seedComponent(component: ComponentLike, entry: ShellyComponentInfo) {
    if (entry.status) {
        component.update(entry.status);
    }

    if (entry.config) {
        if (component instanceof Component) {
            component.config = entry.config;
        } else if (component instanceof DynamicComponent) {
            component.config = entry.config;
        }
    }
}

/**
 * Creates a component instance for a Shelly.GetComponents entry.
 */
export function createComponent(device: Device, entry: ShellyComponentInfo): ComponentLike {
    const parsed = parseComponentKey(entry.key);

    let component: ComponentLike;

    switch (parsed.kind) {
        case 'functional':
            component = createFunctionalComponent(device, parsed);
            break;
        case 'service':
            component = createServiceComponent(device, parsed);
            break;
        case 'unknown':
            component = new DynamicComponent(device, parsed);
            break;
        default: {
            const _exhaustive: never = parsed;
            return _exhaustive;
        }
    }

    seedComponent(component, entry);
    return component;
}
