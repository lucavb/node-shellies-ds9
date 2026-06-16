import type { Cover } from './cover';
import type { Input } from './input';
import type { Light } from './light';
import type { Switch } from './switch';

/** Known functional component keys from Shelly status/config payloads */
export type FunctionalComponentKey =
    | `switch:${number}`
    | `cover:${number}`
    | `light:${number}`
    | `input:${number}`;

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

export type ComponentKey = FunctionalComponentKey | ServiceComponentKey | (string & {});

/** Maps known functional keys to their typed component class */
export interface TypedComponentMap {
    [K: `switch:${number}`]: Switch;
    [K: `cover:${number}`]: Cover;
    [K: `light:${number}`]: Light;
    [K: `input:${number}`]: Input;
}

const FUNCTIONAL_KEY_PATTERN = /^(switch|cover|light|input):(\d+)$/;

export function isFunctionalComponentKey(key: string): key is FunctionalComponentKey {
    return FUNCTIONAL_KEY_PATTERN.test(key);
}

export function parseFunctionalComponentId(key: FunctionalComponentKey): number {
    const colonIndex = key.indexOf(':');
    return Number(key.slice(colonIndex + 1));
}

export function parseFunctionalComponentType(
    key: FunctionalComponentKey,
): 'switch' | 'cover' | 'light' | 'input' {
    const colonIndex = key.indexOf(':');
    return key.slice(0, colonIndex) as 'switch' | 'cover' | 'light' | 'input';
}
