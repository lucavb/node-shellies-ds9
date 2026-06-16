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
    });
});
