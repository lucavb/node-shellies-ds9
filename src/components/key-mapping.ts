import {
    FunctionalComponentKey,
    isFunctionalComponentKey,
    isSensorComponentKey,
    parseFunctionalComponentId,
    parseFunctionalComponentType,
    parseSensorComponentId,
    parseSensorComponentType,
    SensorComponentKey,
    ServiceComponentKey,
} from './keys';

export const FUNCTIONAL_TYPE_TO_RPC = {
    switch: 'Switch',
    cover: 'Cover',
    light: 'Light',
    input: 'Input',
} as const satisfies Record<'switch' | 'cover' | 'light' | 'input', string>;

export const SENSOR_TYPE_TO_RPC = {
    temperature: 'Temperature',
    humidity: 'Humidity',
} as const satisfies Record<'temperature' | 'humidity', string>;

/**
 * RPC name prefixes for dynamic/virtual component types (numeric IDs).
 * @see https://shelly-api-docs.shelly.cloud/gen2/DynamicComponents/
 */
export const DYNAMIC_TYPE_TO_RPC = {
    bthomesensor: 'BTHomeSensor',
    bthomedevice: 'BTHomeDevice',
    em1data: 'EM1Data',
    emdata: 'EMData',
    pm1: 'PM1',
} as const satisfies Record<string, string>;

export const SERVICE_KEY_TO_RPC = {
    'devicepower:0': 'DevicePower',
    'humidity:0': 'Humidity',
    'temperature:0': 'Temperature',
    ble: 'BLE',
    cloud: 'Cloud',
    eth: 'Eth',
    ht_ui: 'HT_UI',
    mqtt: 'MQTT',
    sys: 'Sys',
    ui: 'UI',
    wifi: 'WiFi',
    ws: 'Ws',
} as const satisfies Record<ServiceComponentKey, string>;

export type FunctionalComponentType = keyof typeof FUNCTIONAL_TYPE_TO_RPC;

export type DynamicComponentType = keyof typeof DYNAMIC_TYPE_TO_RPC;

export type SensorComponentType = keyof typeof SENSOR_TYPE_TO_RPC;

export type ParsedComponentKey =
    | { kind: 'functional'; type: FunctionalComponentType; id: number; rpcName: string; key: FunctionalComponentKey }
    | { kind: 'sensor'; type: SensorComponentType; id: number; rpcName: string; key: SensorComponentKey }
    | { kind: 'service'; key: ServiceComponentKey; rpcName: string }
    | { kind: 'unknown'; key: string; rpcName: string; id?: number };

function isServiceComponentKey(key: string): key is ServiceComponentKey {
    return Object.prototype.hasOwnProperty.call(SERVICE_KEY_TO_RPC, key);
}

function resolveTypeRpcName(type: string): string {
    if (Object.prototype.hasOwnProperty.call(DYNAMIC_TYPE_TO_RPC, type)) {
        return DYNAMIC_TYPE_TO_RPC[type as DynamicComponentType];
    }

    if (Object.prototype.hasOwnProperty.call(FUNCTIONAL_TYPE_TO_RPC, type)) {
        return FUNCTIONAL_TYPE_TO_RPC[type as FunctionalComponentType];
    }

    return typeToRpcName(type);
}

/**
 * Best-effort RPC name for component types not in the static maps.
 * Prefer adding known types to {@link DYNAMIC_TYPE_TO_RPC} instead of relying on this.
 */
export function typeToRpcName(type: string): string {
    return type
        .split(/[_-]/)
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');
}

/**
 * Parses a Shelly component key into its RPC name and structural kind.
 */
export function parseComponentKey(key: string): ParsedComponentKey {
    if (isFunctionalComponentKey(key)) {
        const type = parseFunctionalComponentType(key);
        const id = parseFunctionalComponentId(key);

        return {
            id,
            key,
            kind: 'functional',
            rpcName: FUNCTIONAL_TYPE_TO_RPC[type],
            type,
        };
    }

    if (isSensorComponentKey(key)) {
        const type = parseSensorComponentType(key);
        const id = parseSensorComponentId(key);

        return {
            id,
            key,
            kind: 'sensor',
            rpcName: SENSOR_TYPE_TO_RPC[type],
            type,
        };
    }

    if (isServiceComponentKey(key)) {
        return {
            kind: 'service',
            key,
            rpcName: SERVICE_KEY_TO_RPC[key],
        };
    }

    const colonIndex = key.indexOf(':');
    if (colonIndex !== -1) {
        const type = key.slice(0, colonIndex);
        const id = Number(key.slice(colonIndex + 1));

        return {
            kind: 'unknown',
            key,
            rpcName: resolveTypeRpcName(type),
            id: Number.isNaN(id) ? undefined : id,
        };
    }

    return {
        kind: 'unknown',
        key,
        rpcName: resolveTypeRpcName(key),
    };
}
