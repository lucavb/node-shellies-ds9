import { parseComponentKey } from './key-mapping';

describe('parseComponentKey', () => {
    test('parses functional switch keys', () => {
        const parsed = parseComponentKey('switch:0');

        expect(parsed.kind).toBe('functional');
        if (parsed.kind === 'functional') {
            expect(parsed.type).toBe('switch');
            expect(parsed.id).toBe(0);
            expect(parsed.rpcName).toBe('Switch');
            expect(parsed.key).toBe('switch:0');
        }
    });

    test('parses functional cover keys', () => {
        const parsed = parseComponentKey('cover:1');

        expect(parsed).toEqual({
            kind: 'functional',
            type: 'cover',
            id: 1,
            rpcName: 'Cover',
            key: 'cover:1',
        });
    });

    test('parses service keys', () => {
        const parsed = parseComponentKey('wifi');

        expect(parsed).toEqual({
            kind: 'service',
            key: 'wifi',
            rpcName: 'WiFi',
        });
    });

    test('parses sensor humidity keys', () => {
        const parsed = parseComponentKey('humidity:100');

        expect(parsed).toEqual({
            kind: 'sensor',
            type: 'humidity',
            id: 100,
            rpcName: 'Humidity',
            key: 'humidity:100',
        });
    });

    test('parses unknown keyed components', () => {
        const parsed = parseComponentKey('bthomesensor:200');

        expect(parsed.kind).toBe('unknown');
        if (parsed.kind === 'unknown') {
            expect(parsed.key).toBe('bthomesensor:200');
            expect(parsed.rpcName).toBe('BTHomeSensor');
            expect(parsed.id).toBe(200);
        }
    });

    test('parses pm1 dynamic components', () => {
        const parsed = parseComponentKey('pm1:0');

        expect(parsed).toEqual({
            kind: 'unknown',
            key: 'pm1:0',
            rpcName: 'PM1',
            id: 0,
        });
    });

    test('falls back to heuristic for unlisted dynamic types', () => {
        const parsed = parseComponentKey('boolean:200');

        expect(parsed).toEqual({
            kind: 'unknown',
            key: 'boolean:200',
            rpcName: 'Boolean',
            id: 200,
        });
    });

    test('parses unknown bare keys', () => {
        const parsed = parseComponentKey('script');

        expect(parsed).toEqual({
            kind: 'unknown',
            key: 'script',
            rpcName: 'Script',
        });
    });
});
