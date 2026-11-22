import { DynamicComponent, EM, EM1, EM1Data, EMData, Humidity, RGB, RGBW, Switch, Temperature } from '../components';
import type { ComponentLike } from '../components';
import { GenericDevice, isGenericDevice } from './generic';
import { RpcHandler } from '../rpc';

class TestRpcHandler extends RpcHandler {
    constructor() {
        super('test');
    }

    connected = true;
    request = vi.fn();
    destroy = vi.fn().mockImplementation(() => Promise.resolve());
}

describe('GenericDevice', () => {
    const info = {
        id: 'abc123',
        mac: 'abc123',
        model: 'UNKNOWN-MODEL',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('discovers components via Shelly.GetComponents', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                return Promise.resolve({
                    components: [
                        {
                            key: 'switch:0',
                            status: { output: true, source: 'init' },
                        },
                        {
                            key: 'wifi',
                        },
                    ],
                    cfg_rev: 1,
                    offset: 0,
                    total: 2,
                });
            }

            return Promise.resolve({});
        });

        const device = await GenericDevice.create(info, rpcHandler);

        expect(device.getComponent('switch:0')).toBeInstanceOf(Switch);
        expect(device.get('switch:0').output).toBe(true);
        expect(device.hasComponent('wifi')).toBe(true);
        expect(isGenericDevice(device)).toBe(true);
    });

    test('does not prune discovered components when a refresh cannot get a consistent inventory', async () => {
        const rpcHandler = new TestRpcHandler();
        let componentRequest = 0;
        rpcHandler.request.mockImplementation((method: string, params: { offset?: number }) => {
            if (method !== 'Shelly.GetComponents') {
                return Promise.resolve({});
            }

            componentRequest++;
            if (componentRequest === 1) {
                return Promise.resolve({
                    components: [{ key: 'switch:0' }, { key: 'wifi' }],
                    cfg_rev: 1,
                    offset: 0,
                    total: 2,
                });
            }

            const scan = Math.floor((componentRequest - 2) / 2);
            if (params.offset === 0) {
                return Promise.resolve({
                    components: [{ key: 'wifi' }],
                    cfg_rev: scan + 2,
                    offset: 0,
                    total: 2,
                });
            }
            return Promise.resolve({
                components: [{ key: 'switch:0' }],
                cfg_rev: scan + 3,
                offset: 1,
                total: 2,
            });
        });

        const device = await GenericDevice.create(info, rpcHandler);
        const switchComponent = device.getComponent('switch:0');
        const wifiComponent = device.getComponent('wifi');

        await expect(device.rediscoverComponents()).rejects.toThrow(
            'Shelly.GetComponents configuration revision changed during all 3 discovery attempts',
        );

        expect(device.getComponent('switch:0')).toBe(switchComponent);
        expect(device.getComponent('wifi')).toBe(wifiComponent);
    });

    test('types get() for discovered component keys while retaining the unknown-key fallback', async () => {
        const rpcHandler = new TestRpcHandler();
        const keys = [
            'switch:0',
            'temperature:1',
            'humidity:1',
            'em:0',
            'em1:1',
            'emdata:0',
            'em1data:1',
            'rgb:0',
            'rgbw:1',
            'bthomesensor:513',
        ];
        rpcHandler.request.mockResolvedValue({
            components: keys.map((key) => ({ key })),
            cfg_rev: 1,
            offset: 0,
            total: keys.length,
        });

        const device = await GenericDevice.create(info, rpcHandler);
        const sw: Switch = device.get('switch:0');
        const temperature: Temperature = device.get('temperature:1');
        const humidity: Humidity = device.get('humidity:1');
        const em: EM = device.get('em:0');
        const em1: EM1 = device.get('em1:1');
        const emData: EMData = device.get('emdata:0');
        const em1Data: EM1Data = device.get('em1data:1');
        const rgb: RGB = device.get('rgb:0');
        const rgbw: RGBW = device.get('rgbw:1');
        const unknown: ComponentLike = device.get('bthomesensor:513');

        expect(sw).toBeInstanceOf(Switch);
        expect(temperature).toBeInstanceOf(Temperature);
        expect(humidity).toBeInstanceOf(Humidity);
        expect(em).toBeInstanceOf(EM);
        expect(em1).toBeInstanceOf(EM1);
        expect(emData).toBeInstanceOf(EMData);
        expect(em1Data).toBeInstanceOf(EM1Data);
        expect(rgb).toBeInstanceOf(RGB);
        expect(rgbw).toBeInstanceOf(RGBW);
        expect(unknown).toBe(device.getComponent('bthomesensor:513'));
    });

    test('routes split-ID BTHome and BLU events exactly once', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockResolvedValue({
            components: [{ key: 'bthomesensor:513' }, { key: 'blutrv:12' }],
            cfg_rev: 1,
            offset: 0,
            total: 2,
        });

        const device = await GenericDevice.create(info, rpcHandler);
        const bthomeEvent = vi.fn();
        const bluEvent = vi.fn();
        device.getComponent('bthomesensor:513')?.on('event', bthomeEvent);
        device.getComponent('blutrv:12')?.on('event', bluEvent);

        rpcHandler.emit('event', {
            ts: 1,
            events: [
                { component: 'bthomesensor', id: 513, event: 'updated', ts: 1 },
                { component: 'blutrv', id: 12, event: 'updated', ts: 1 },
            ],
        });

        expect(bthomeEvent).toHaveBeenCalledTimes(1);
        expect(bluEvent).toHaveBeenCalledTimes(1);
    });

    test('exposes dynamic component attrs and refreshes supplied metadata without replacing components', async () => {
        const rpcHandler = new TestRpcHandler();
        let components: Array<{ key: string; attrs?: unknown }> = [
            { key: 'blutrv:200', attrs: { flags: 17, model_id: 8 } },
            { key: 'bthomesensor:200' },
            { key: 'bthomedevice:201', attrs: ['malformed'] },
        ];
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                return Promise.resolve({ components, cfg_rev: 1, offset: 0, total: components.length });
            }
            return Promise.resolve({});
        });

        const device = await GenericDevice.create(info, rpcHandler);
        const trv = device.get('blutrv:200') as DynamicComponent;
        const sensor = device.get('bthomesensor:200') as DynamicComponent;
        const malformed = device.get('bthomedevice:201') as DynamicComponent;

        expect(trv.attrs).toEqual({ flags: 17, model_id: 8 });
        expect(sensor.attrs).toBeUndefined();
        expect(malformed.attrs).toBeUndefined();

        components = [
            { key: 'blutrv:200', attrs: { flags: 1, model_id: 9 } },
            { key: 'bthomesensor:200', attrs: { flags: 2 } },
            { key: 'bthomedevice:201', attrs: { flags: 4 } },
        ];
        await device.rediscoverComponents();

        expect(device.get('blutrv:200')).toBe(trv);
        expect(trv.attrs).toEqual({ flags: 1, model_id: 9 });
        expect(sensor.attrs).toEqual({ flags: 2 });
        expect(malformed.attrs).toEqual({ flags: 4 });

        components = [{ key: 'blutrv:200' }, { key: 'bthomesensor:200' }, { key: 'bthomedevice:201' }];
        await device.rediscoverComponents();

        expect(trv.attrs).toEqual({ flags: 1, model_id: 9 });
        expect(sensor.attrs).toEqual({ flags: 2 });
        expect(malformed.attrs).toEqual({ flags: 4 });
    });

    test('iterates discovered components including sys', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockResolvedValue({
            components: [{ key: 'switch:1' }],
            cfg_rev: 1,
            offset: 0,
            total: 1,
        });

        const device = await GenericDevice.create(info, rpcHandler);
        const keys = Array.from(device).map(([key]) => key);

        expect(keys).toEqual(['sys', 'switch:1']);
    });

    test('routes status updates to discovered components', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockResolvedValue({
            components: [{ key: 'switch:0', status: { output: false } }],
            cfg_rev: 1,
            offset: 0,
            total: 1,
        });

        const device = await GenericDevice.create(info, rpcHandler);
        const listener = vi.fn();
        device.get('switch:0').on('change:output', listener);

        rpcHandler.emit('statusUpdate', {
            ts: 1,
            'switch:0': { output: true },
        });

        expect(listener).toHaveBeenCalledWith(true);
        expect(device.get('switch:0').output).toBe(true);
    });

    test('throws when requesting a missing component', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockResolvedValue({
            components: [],
            cfg_rev: 1,
            offset: 0,
            total: 0,
        });

        const device = await GenericDevice.create(info, rpcHandler);

        expect(() => device.get('switch:9')).toThrow('Component not found: switch:9');
    });

    test('uses the model string in modelName', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockResolvedValue({
            components: [],
            cfg_rev: 1,
            offset: 0,
            total: 0,
        });

        const device = await GenericDevice.create(info, rpcHandler);

        expect(device.model).toBe('UNKNOWN-MODEL');
        expect(device.modelName).toBe('Shelly UNKNOWN-MODEL');
    });

    test('skips the first loadStatus after discovery then refreshes on subsequent calls', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                return Promise.resolve({
                    components: [{ key: 'switch:0', status: { output: false } }],
                    cfg_rev: 1,
                    offset: 0,
                    total: 1,
                });
            }

            if (method === 'Shelly.GetStatus') {
                return Promise.resolve({
                    'switch:0': { output: true, source: 'http' },
                });
            }

            return Promise.resolve({});
        });

        const device = await GenericDevice.create(info, rpcHandler);

        await device.loadStatus();
        expect(device.get('switch:0').output).toBe(false);

        await device.loadStatus();
        expect(device.get('switch:0').output).toBe(true);
        expect(rpcHandler.request).toHaveBeenCalledWith('Shelly.GetStatus', undefined);
    });

    test('does not suppress explicit status/config refreshes after rediscovery', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                return Promise.resolve({
                    components: [{ key: 'switch:0', status: { output: false } }],
                    cfg_rev: 1,
                    offset: 0,
                    total: 1,
                });
            }
            if (method === 'Shelly.GetStatus') {
                return Promise.resolve({ 'switch:0': { output: true } });
            }
            if (method === 'Shelly.GetConfig') {
                return Promise.resolve({ 'switch:0': { name: 'refreshed' } });
            }
            return Promise.resolve({});
        });

        const device = await GenericDevice.create(info, rpcHandler);
        await device.loadStatus(); // Initial GetComponents data is already seeded.
        await device.loadConfig();

        await device.rediscoverComponents();
        await device.loadStatus();
        await device.loadConfig();

        expect(rpcHandler.request).toHaveBeenCalledWith('Shelly.GetStatus', undefined);
        expect(rpcHandler.request).toHaveBeenCalledWith('Shelly.GetConfig', undefined);
        expect(device.get('switch:0').output).toBe(true);
        expect((device.get('switch:0') as Switch).config).toEqual({ name: 'refreshed' });
    });

    test('refreshBTHomeComponents delegates to the generic runtime inventory refresh', async () => {
        const rpcHandler = new TestRpcHandler();
        let components: Array<{ key: string }> = [];
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                return Promise.resolve({ components, cfg_rev: 1, offset: 0, total: components.length });
            }
            return Promise.resolve({});
        });

        const device = await GenericDevice.create(info, rpcHandler);
        components = [{ key: 'bthomedevice:257' }, { key: 'bthomesensor:513' }];

        await device.refreshBTHomeComponents();

        expect(device.hasComponent('bthomedevice:257')).toBe(true);
        expect(device.hasComponent('bthomesensor:513')).toBe(true);
    });
});
