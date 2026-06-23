import { parseComponentKey } from './key-mapping';

/**
 * Minimum component ID for Shelly Sensor Add-on peripherals.
 * @see https://shelly-api-docs.shelly.cloud/gen2/Addons/ShellySensorAddon
 */
export const ADDON_SENSOR_MIN_ID = 100;

/**
 * Returns true when the key is a temperature or humidity component with an add-on ID.
 */
export function isAddonSensorKey(key: string): boolean {
    const parsed = parseComponentKey(key);
    if (parsed.kind !== 'sensor') {
        return false;
    }

    return parsed.id >= ADDON_SENSOR_MIN_ID;
}

/**
 * Collects add-on temperature/humidity component keys from Shelly status/config payloads.
 */
export function collectAddonSensorKeys(...sources: Array<Record<string, unknown>>): string[] {
    const keys = new Set<string>();

    for (const source of sources) {
        for (const key of Object.keys(source)) {
            if (isAddonSensorKey(key)) {
                keys.add(key);
            }
        }
    }

    return [...keys];
}
