import type { Cover } from './cover';
import type { Humidity } from './humidity';
import type { Input } from './input';
import type { Light } from './light';
import type { Switch } from './switch';
import type { Temperature } from './temperature';

/** Known functional component keys from Shelly status/config payloads */
export type FunctionalComponentKey = `switch:${number}` | `cover:${number}` | `light:${number}` | `input:${number}`;

/** Temperature and humidity component keys (any numeric ID). */
export type SensorComponentKey = `temperature:${number}` | `humidity:${number}`;

export type ServiceComponentKey =
    | 'sys'
    | 'wifi'
    | 'mqtt'
    | 'eth'
    | 'ble'
    | 'cloud'
    | 'ws'
    | 'ui'
    | 'ht_ui'
    | 'devicepower:0'
    | 'humidity:0'
    | 'temperature:0';

export type ComponentKey = FunctionalComponentKey | ServiceComponentKey | SensorComponentKey | (string & {});

/** Maps known functional keys to their typed component class */
export interface TypedComponentMap {
    [K: `switch:${number}`]: Switch;
    [K: `cover:${number}`]: Cover;
    [K: `light:${number}`]: Light;
    [K: `input:${number}`]: Input;
    [K: `temperature:${number}`]: Temperature;
    [K: `humidity:${number}`]: Humidity;
}

const FUNCTIONAL_KEY_PATTERN = /^(switch|cover|light|input):(\d+)$/;
const SENSOR_KEY_PATTERN = /^(temperature|humidity):(\d+)$/;

export function isFunctionalComponentKey(key: string): key is FunctionalComponentKey {
    return FUNCTIONAL_KEY_PATTERN.test(key);
}

export function parseFunctionalComponentId(key: FunctionalComponentKey): number {
    const colonIndex = key.indexOf(':');
    return Number(key.slice(colonIndex + 1));
}

export function parseFunctionalComponentType(key: FunctionalComponentKey): 'switch' | 'cover' | 'light' | 'input' {
    const colonIndex = key.indexOf(':');
    return key.slice(0, colonIndex) as 'switch' | 'cover' | 'light' | 'input';
}

export function isSensorComponentKey(key: string): key is SensorComponentKey {
    return SENSOR_KEY_PATTERN.test(key) && key !== 'temperature:0' && key !== 'humidity:0';
}

export function parseSensorComponentId(key: SensorComponentKey): number {
    const colonIndex = key.indexOf(':');
    return Number(key.slice(colonIndex + 1));
}

export function parseSensorComponentType(key: SensorComponentKey): 'temperature' | 'humidity' {
    const colonIndex = key.indexOf(':');
    return key.slice(0, colonIndex) as 'temperature' | 'humidity';
}
