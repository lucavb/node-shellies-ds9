import { Device } from './base';
import { ShellyDimmerGen4, ShellyDimmerGen4US, ShellyPlusRGBWPM } from './shelly-lighting';
import { RpcHandler } from '../rpc';

class TestRpcHandler extends RpcHandler {
    connected = true;
    request = vi.fn().mockResolvedValue({});
    destroy = vi.fn().mockResolvedValue(undefined);

    constructor() {
        super('test');
    }
}

const create = (model: string, profile?: string) => {
    const handler = new TestRpcHandler();
    const deviceClass = Device.getClass(model);
    if (!deviceClass) {
        throw new Error(`No device class registered for ${model}`);
    }
    return new deviceClass({ id: model, mac: '00:00:00:00:00:01', model, profile }, handler);
};

describe('Shelly lighting devices', () => {
    test.each([
        ['S4DM-0A101WWL', ShellyDimmerGen4],
        ['S4DM-0A102US', ShellyDimmerGen4US],
        ['SNDC-0D4P10WW', ShellyPlusRGBWPM],
    ])('%s resolves to its model class', (model, cls) => {
        expect(Device.getClass(model)).toBe(cls);
    });

    test('EU Gen4 status matches the sampled WiFi/BLE/connectivity, input, and light topology', () => {
        const handler = new TestRpcHandler();
        const dimmer = new ShellyDimmerGen4({ id: 'S4DM-0A101WWL', mac: '00:00:00:00:00:01' }, handler);

        // S4DM-0A101WWL GetStatus sample; firmware-specific component inventories may vary.
        handler.emit('statusUpdate', {
            wifi: { sta_ip: '192.0.2.10', status: 'got ip', ssid: 'test' },
            ble: {},
            cloud: { connected: true },
            mqtt: { connected: false },
            ws: { connected: true },
            'input:0': { id: 0, state: false },
            'input:1': { id: 1, state: true },
            'light:0': { id: 0, output: true, brightness: 42 },
        });

        for (const key of ['wifi', 'ble', 'cloud', 'mqtt', 'ws', 'input:0', 'input:1', 'light:0']) {
            expect(dimmer.hasComponent(key)).toBe(true);
        }
        expect(dimmer.hasComponent('eth')).toBe(false);
        expect(dimmer.hasComponent('ui')).toBe(false);
        // Script support is retained even though the sampled GetStatus omits it.
        expect(dimmer.hasComponent('script')).toBe(true);
        expect(dimmer.input0.state).toBe(false);
        expect(dimmer.input1.state).toBe(true);
        expect(dimmer.light0.brightness).toBe(42);
    });

    test('US Gen4 keeps the prior Plus PM inventory in the absence of a US fixture', () => {
        const dimmer = create('S4DM-0A102US');
        expect(dimmer.hasComponent('eth')).toBe(true);
        expect(dimmer.hasComponent('ui')).toBe(true);
        expect(dimmer.hasComponent('input:0')).toBe(true);
        expect(dimmer.hasComponent('input:1')).toBe(true);
        expect(dimmer.hasComponent('light:0')).toBe(true);
    });

    test.each([
        ['rgbw', ['rgbw:0']],
        ['rgb', ['rgb:0']],
        ['light', ['light:0', 'light:1', 'light:2', 'light:3']],
    ])('exposes only the active %s profile lighting component(s)', (profile, activeKeys) => {
        const device = create('SNDC-0D4P10WW', profile);
        expect(device.profile).toBe(profile);
        for (const activeKey of activeKeys) {
            expect(device.hasComponent(activeKey)).toBe(true);
        }
        for (const inactiveKey of ['rgbw:0', 'rgb:0', 'light:0']) {
            if (!activeKeys.includes(inactiveKey)) {
                expect(device.hasComponent(inactiveKey)).toBe(false);
            }
        }
        for (const id of [0, 1, 2, 3]) {
            expect(device.hasComponent(`input:${id}`)).toBe(true);
        }
    });

    test('light profile input and lighting status notifications update their components', () => {
        const handler = new TestRpcHandler();
        const device = new ShellyPlusRGBWPM({ id: 'rgbw-light', mac: '00:00:00:00:00:01', profile: 'light' }, handler);
        const lightChanges = vi.fn();
        device.light3?.on('change', lightChanges);

        handler.emit('statusUpdate', {
            ts: 1,
            'input:3': { id: 3, state: true },
            'light:3': { id: 3, output: true, brightness: 45 },
        });

        expect(device.input3.state).toBe(true);
        expect(device.light3?.brightness).toBe(45);
        expect(device.hasComponent('light:0')).toBe(true);
        expect(device.hasComponent('light:1')).toBe(true);
        expect(device.hasComponent('light:2')).toBe(true);
        expect(device.hasComponent('light:3')).toBe(true);
        expect(lightChanges).toHaveBeenCalledWith('output', true);
        expect(lightChanges).toHaveBeenCalledWith('brightness', 45);
    });

    test('infers a missing profile from a cached first notification and updates registry iteration', () => {
        const handler = new TestRpcHandler();
        const device = new ShellyPlusRGBWPM({ id: 'rgbw-unknown', mac: '00:00:00:00:00:01' }, handler);

        // Force the component map to be cached before profile discovery.
        expect(device.hasComponent('rgb:0')).toBe(false);
        handler.emit('statusUpdate', {
            ts: 1,
            'input:2': { id: 2, state: false },
            'rgb:0': {
                id: 0,
                output: true,
                rgb: [54, 97, 255],
                brightness: 62,
                aenergy: { total: 86.182, by_minute: [0, 0, 0], minute_ts: 1779361440 },
                apower: 0,
                current: 0,
                voltage: 12.6,
            },
        });

        expect(device.hasComponent('rgb:0')).toBe(true);
        expect(device.hasComponent('rgbw:0')).toBe(false);
        expect(device.rgb?.aenergy?.total).toBe(86.182);
        expect(device.input2.state).toBe(false);
        expect([...device].some(([key]) => key === 'rgb:0')).toBe(true);
    });

    test('infers a missing profile from loadStatus seed and registers all four lights', async () => {
        const handler = new TestRpcHandler();
        handler.request.mockResolvedValueOnce({
            'input:0': { id: 0, state: null },
            'input:1': { id: 1, state: null },
            'input:2': { id: 2, state: null },
            'input:3': { id: 3, state: null },
            'light:0': { id: 0, output: false, brightness: 1 },
            'light:1': { id: 1, output: false, brightness: 1 },
            'light:2': { id: 2, output: true, brightness: 45 },
            'light:3': { id: 3, output: false, brightness: 1 },
        });
        const device = new ShellyPlusRGBWPM({ id: 'rgbw-seed', mac: '00:00:00:00:00:01' }, handler);
        expect(device.hasComponent('light:2')).toBe(false);

        await device.loadStatus();

        expect(device.light2?.brightness).toBe(45);
        expect([...device].filter(([key]) => key.startsWith('light:')).map(([key]) => key)).toEqual([
            'light:0',
            'light:1',
            'light:2',
            'light:3',
        ]);
    });

    test('switches runtime topology after reconnect while keeping initial profile metadata and inputs', () => {
        const handler = new TestRpcHandler();
        const device = new ShellyPlusRGBWPM(
            { id: 'rgbw-reconnect', mac: '00:00:00:00:00:01', profile: 'rgbw' },
            handler,
        );
        const commonInput = device.input0;
        const previousRGBW = device.rgbw;
        expect(previousRGBW).toBeDefined();

        handler.emit('disconnect', 1006, 'connection lost', null);
        handler.emit('connect');
        handler.emit('statusUpdate', {
            ts: 2,
            'input:0': { id: 0, state: true },
            'rgb:0': { id: 0, output: true, rgb: [54, 97, 255], brightness: 62, apower: 4.2 },
        });

        expect(device.profile).toBe('rgbw');
        expect(device.input0).toBe(commonInput);
        expect(device.input0.state).toBe(true);
        expect(device.rgbw).toBeUndefined();
        expect(device.hasComponent('rgbw:0')).toBe(false);
        expect(device.rgb?.brightness).toBe(62);
        expect(device.rgb?.apower).toBe(4.2);
        expect([...device].some(([key]) => key === 'rgbw:0')).toBe(false);
        expect([...device].some(([key]) => key === 'rgb:0')).toBe(true);

        handler.emit('statusUpdate', {
            ts: 3,
            'light:0': { id: 0, output: false, brightness: 1 },
            'light:1': { id: 1, output: true, brightness: 35 },
            'light:2': { id: 2, output: false, brightness: 1 },
            'light:3': { id: 3, output: false, brightness: 1 },
        });

        expect(device.rgb).toBeUndefined();
        expect(device.hasComponent('rgb:0')).toBe(false);
        expect(device.light1?.brightness).toBe(35);
        expect([...device].filter(([key]) => key.startsWith('light:'))).toHaveLength(4);
    });

    test('does not switch topology for mixed-profile status, then accepts unambiguous profile evidence', () => {
        const handler = new TestRpcHandler();
        const device = new ShellyPlusRGBWPM(
            { id: 'rgbw-ambiguous', mac: '00:00:00:00:00:01', profile: 'rgbw' },
            handler,
        );
        const initialRGBW = device.rgbw;

        handler.emit('statusUpdate', {
            ts: 1,
            'rgbw:0': { id: 0, output: true, white: 20 },
            'rgb:0': { id: 0, output: true, rgb: [1, 2, 3] },
        });

        expect(device.rgbw).toBe(initialRGBW);
        expect(device.hasComponent('rgbw:0')).toBe(true);
        expect(device.hasComponent('rgb:0')).toBe(false);
        expect(device.rgbw?.white).toBe(20);

        handler.emit('statusUpdate', { ts: 2, 'rgb:0': { id: 0, output: true, brightness: 50 } });

        expect(device.rgbw).toBeUndefined();
        expect(device.hasComponent('rgbw:0')).toBe(false);
        expect(device.rgb?.brightness).toBe(50);
    });
});
