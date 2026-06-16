import { Switch } from '../components';
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
});
