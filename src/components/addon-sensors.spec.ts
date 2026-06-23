import { describe, expect, test } from 'vitest';

import { isAddonSensorKey, collectAddonSensorKeys } from './addon-sensors';
import { parseComponentKey } from './key-mapping';

describe('addon sensor keys', () => {
    test('parses temperature:100 as sensor kind', () => {
        const parsed = parseComponentKey('temperature:100');

        expect(parsed.kind).toBe('sensor');
        if (parsed.kind === 'sensor') {
            expect(parsed.type).toBe('temperature');
            expect(parsed.id).toBe(100);
            expect(parsed.rpcName).toBe('Temperature');
        }
    });

    test('parses humidity:101 as sensor kind', () => {
        const parsed = parseComponentKey('humidity:101');

        expect(parsed).toEqual({
            kind: 'sensor',
            type: 'humidity',
            id: 101,
            rpcName: 'Humidity',
            key: 'humidity:101',
        });
    });

    test('keeps temperature:0 as service key for Shelly H&T', () => {
        const parsed = parseComponentKey('temperature:0');

        expect(parsed.kind).toBe('service');
    });

    test('identifies add-on sensor keys with id >= 100', () => {
        expect(isAddonSensorKey('temperature:100')).toBe(true);
        expect(isAddonSensorKey('humidity:100')).toBe(true);
        expect(isAddonSensorKey('temperature:99')).toBe(false);
        expect(isAddonSensorKey('switch:0')).toBe(false);
    });

    test('collects add-on keys from status payloads', () => {
        const keys = collectAddonSensorKeys({
            'switch:0': {},
            'temperature:100': { id: 100, tC: 21.5 },
            'temperature:101': { id: 101, tC: 22.1 },
            'humidity:100': { id: 100, rh: 55 },
            'temperature:0': { id: 0, tC: 20 },
        });

        expect(keys.sort()).toEqual(['humidity:100', 'temperature:100', 'temperature:101']);
    });
});
