import { Device } from '../devices';
import { RpcHandler } from '../rpc';
import { ShellyService } from './shelly';

class TestRpcHandler extends RpcHandler {
    constructor() {
        super('test');
    }

    connected = true;
    request = vi.fn().mockResolvedValue({ success: true });
    destroy = vi.fn().mockImplementation(() => Promise.resolve());
}

class TestDevice extends Device {
    constructor() {
        super(
            {
                id: 'abc123',
                mac: 'abc123',
            },
            new TestRpcHandler(),
        );
    }
}

describe('ShellyService', () => {
    let device = new TestDevice();
    let service = new ShellyService(device);

    beforeEach(() => {
        device = new TestDevice();
        service = new ShellyService(device);
    });

    describe('.setAuth()', () => {
        test('creates a valid hash', async () => {
            const crypto = await import('crypto');
            const password = 'qwerty';
            const hash = crypto.createHash('sha256').update(`admin:${device.id}:${password}`).digest('hex');

            service.setAuth(password);

            expect(device.rpcHandler.request).toHaveBeenCalledWith('Shelly.SetAuth', {
                user: 'admin',
                realm: device.id,
                ha1: hash,
            });
        });

        test('creates no hash when password is null', () => {
            service.setAuth(null);

            expect(device.rpcHandler.request).toHaveBeenCalledWith('Shelly.SetAuth', {
                user: 'admin',
                realm: device.id,
                ha1: null,
            });
        });
    });

    describe('.getAllComponents()', () => {
        test('paginates through all component pages', async () => {
            const request = vi
                .fn()
                .mockResolvedValueOnce({
                    components: [{ key: 'switch:0' }, { key: 'wifi' }],
                    cfg_rev: 1,
                    offset: 0,
                    total: 3,
                })
                .mockResolvedValueOnce({
                    components: [{ key: 'sys' }],
                    cfg_rev: 1,
                    offset: 2,
                    total: 3,
                });

            device = new TestDevice();
            (device.rpcHandler as TestRpcHandler).request = request;
            service = new ShellyService(device);

            const components = await service.getAllComponents(['status', 'config']);

            expect(components).toEqual([{ key: 'switch:0' }, { key: 'wifi' }, { key: 'sys' }]);
            expect(request).toHaveBeenCalledTimes(2);
            expect(request).toHaveBeenNthCalledWith(1, 'Shelly.GetComponents', {
                offset: 0,
                include: ['status', 'config'],
            });
            expect(request).toHaveBeenNthCalledWith(2, 'Shelly.GetComponents', {
                offset: 2,
                include: ['status', 'config'],
            });
        });

        test('restarts the complete scan when cfg_rev changes between pages', async () => {
            const request = vi
                .fn()
                .mockResolvedValueOnce({
                    components: [{ key: 'switch:0' }, { key: 'wifi' }],
                    cfg_rev: 1,
                    offset: 0,
                    total: 4,
                })
                .mockResolvedValueOnce({
                    components: [{ key: 'stale:0' }, { key: 'stale:1' }],
                    cfg_rev: 2,
                    offset: 2,
                    total: 4,
                })
                .mockResolvedValueOnce({
                    components: [{ key: 'switch:0' }, { key: 'sys' }],
                    cfg_rev: 2,
                    offset: 0,
                    total: 4,
                })
                .mockResolvedValueOnce({
                    components: [{ key: 'wifi' }, { key: 'mqtt' }],
                    cfg_rev: 2,
                    offset: 2,
                    total: 4,
                });

            device = new TestDevice();
            (device.rpcHandler as TestRpcHandler).request = request;
            service = new ShellyService(device);

            const components = await service.getAllComponents(['status']);

            expect(components).toEqual([{ key: 'switch:0' }, { key: 'sys' }, { key: 'wifi' }, { key: 'mqtt' }]);
            expect(components.some(({ key }) => key.startsWith('stale:'))).toBe(false);
            expect(request.mock.calls.map(([, params]) => params?.offset)).toEqual([0, 2, 0, 2]);
        });

        test('rejects after bounded retries when cfg_rev keeps changing', async () => {
            const request = vi.fn().mockImplementation((_method: string, params: { offset: number }) => {
                const revision = Math.floor(request.mock.calls.length / 2);
                const page =
                    params.offset === 0
                        ? { components: [{ key: 'switch:0' }], cfg_rev: revision + 1, offset: 0, total: 2 }
                        : { components: [{ key: 'wifi' }], cfg_rev: revision + 2, offset: 1, total: 2 };
                return Promise.resolve(page);
            });

            device = new TestDevice();
            (device.rpcHandler as TestRpcHandler).request = request;
            service = new ShellyService(device);

            await expect(service.getAllComponents()).rejects.toThrow(
                'Shelly.GetComponents configuration revision changed during all 3 discovery attempts',
            );
            expect(request).toHaveBeenCalledTimes(6);
            expect(request.mock.calls.map(([, params]) => params?.offset)).toEqual([0, 1, 0, 1, 0, 1]);
        });

        test('returns a single-page inventory without another request', async () => {
            const request = vi.fn().mockResolvedValue({
                components: [{ key: 'switch:0' }],
                cfg_rev: 1,
                offset: 0,
                total: 1,
            });

            device = new TestDevice();
            (device.rpcHandler as TestRpcHandler).request = request;
            service = new ShellyService(device);

            await expect(service.getAllComponents()).resolves.toEqual([{ key: 'switch:0' }]);
            expect(request).toHaveBeenCalledTimes(1);
        });

        test('throws when a page is empty before the advertised total', async () => {
            const request = vi
                .fn()
                .mockResolvedValueOnce({
                    components: [{ key: 'switch:0' }],
                    cfg_rev: 1,
                    offset: 0,
                    total: 2,
                })
                .mockResolvedValueOnce({
                    components: [],
                    cfg_rev: 1,
                    offset: 1,
                    total: 2,
                });

            device = new TestDevice();
            (device.rpcHandler as TestRpcHandler).request = request;
            service = new ShellyService(device);

            await expect(service.getAllComponents(['status', 'config'])).rejects.toThrow(
                'Shelly.GetComponents returned an empty page before discovery was complete',
            );
            expect(request).toHaveBeenCalledTimes(2);
        });
    });
});
