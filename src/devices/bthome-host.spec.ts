import { DynamicComponent } from '../components';
import { RpcHandler, RpcStatusNotification } from '../rpc';
import { createDeviceFromInfo } from '../internal/create-device';
import { Device, DeviceInfo } from './base';
import { ShellyPro3EM } from './shelly-energy-meter';

class TestRpcHandler extends RpcHandler {
    constructor() {
        super('test');
    }

    connected = true;
    request = vi.fn();
    destroy = vi.fn().mockResolvedValue(undefined);
}

class TestDevice extends Device {}

class StatusOverrideDevice extends TestDevice {
    readonly initialUpdates: RpcStatusNotification[] = [];

    protected override statusUpdateHandler(update: RpcStatusNotification) {
        this.initialUpdates.push(update);
        super.statusUpdateHandler(update);
    }
}

const info: DeviceInfo = {
    id: 'host-1',
    mac: 'host-mac',
    model: 'TEST',
};

function page(
    components: Array<{
        key: string;
        status?: Record<string, unknown>;
        config?: Record<string, unknown>;
        attrs?: Record<string, unknown>;
    }>,
    total: number,
    offset = 0,
) {
    return { components, cfg_rev: 1, offset, total };
}

describe('Device BTHome host discovery', () => {
    test('only fetches on opt-in and discovers paginated BTHome devices and sensors', async () => {
        const rpc = new TestRpcHandler();
        rpc.request.mockImplementation((_method: string, params?: { offset?: number }) => {
            if (params?.offset === 0) {
                return Promise.resolve(
                    page([{ key: 'switch:0' }, { key: 'bthomedevice:257', status: { paired: true } }], 3),
                );
            }
            return Promise.resolve(page([{ key: 'bthomesensor:513', status: { value: 21 } }], 3, 2));
        });
        const device = new TestDevice(info, rpc);

        expect(rpc.request).not.toHaveBeenCalled();
        expect(device.hasComponent('bthomesensor:513')).toBe(false);

        await device.refreshBTHomeComponents();

        expect(rpc.request).toHaveBeenNthCalledWith(1, 'Shelly.GetComponents', {
            offset: 0,
            include: ['status', 'config'],
        });
        expect(rpc.request).toHaveBeenNthCalledWith(2, 'Shelly.GetComponents', {
            offset: 2,
            include: ['status', 'config'],
        });
        expect(device.getComponent('bthomedevice:257')).toBeInstanceOf(DynamicComponent);
        expect(device.getComponent('bthomesensor:513')).toBeInstanceOf(DynamicComponent);
        expect(device.hasComponent('switch:0')).toBe(false);
        expect([...device].map(([key]) => key)).toContain('bthomesensor:513');
    });

    test('retains objects, refreshes status/config, routes notifications by ID, and removes stale entries', async () => {
        const rpc = new TestRpcHandler();
        let inventory = page(
            [
                {
                    key: 'bthomesensor:513',
                    status: { value: 21 },
                    config: { name: 'Kitchen' },
                },
                { key: 'bthomedevice:257', status: { paired: true } },
            ],
            2,
        );
        rpc.request.mockImplementation(() => Promise.resolve(inventory));
        const device = new TestDevice(info, rpc);

        await device.refreshBTHomeComponents();
        const sensor = device.getComponent('bthomesensor:513') as DynamicComponent;
        const changed = vi.fn();
        const event = vi.fn();
        sensor.on('change:value', changed);
        sensor.on('event', event);

        rpc.emit('statusUpdate', { ts: 1, 'bthomesensor:513': { value: 22 } });
        expect(sensor.status.value).toBe(22);
        expect(changed).toHaveBeenCalledWith(22);

        rpc.emit('event', {
            ts: 2,
            events: [{ component: 'bthomesensor', id: 513, event: 'updated', ts: 2 }],
        });
        expect(event).toHaveBeenCalledWith(expect.objectContaining({ id: 513, event: 'updated' }));

        inventory = page([{ key: 'bthomesensor:513', status: { value: 23 }, config: { name: 'Office' } }], 1);
        await device.refreshBTHomeComponents();

        expect(device.getComponent('bthomesensor:513')).toBe(sensor);
        expect(sensor.status.value).toBe(23);
        expect(sensor.config).toEqual({ name: 'Office' });
        expect(device.hasComponent('bthomedevice:257')).toBe(false);
        expect([...device].map(([key]) => key)).not.toContain('bthomedevice:257');
    });

    test('exposes and refreshes attrs on hosted BTHome components while preserving identity', async () => {
        const rpc = new TestRpcHandler();
        let inventory = page(
            [
                {
                    key: 'bthomedevice:200',
                    status: { paired: true },
                    config: { name: 'Shelly BLU TRV' },
                    attrs: { flags: 17, model_id: 8 },
                },
                { key: 'bthomesensor:202', status: { value: 19 } },
            ],
            2,
        );
        rpc.request.mockImplementation(() => Promise.resolve(inventory));
        const device = new TestDevice(info, rpc);

        await device.refreshBTHomeComponents();
        const bthomeDevice = device.getComponent('bthomedevice:200') as DynamicComponent;
        const sensor = device.getComponent('bthomesensor:202') as DynamicComponent;
        expect(bthomeDevice.attrs).toEqual({ flags: 17, model_id: 8 });
        expect(sensor.attrs).toBeUndefined();

        inventory = page(
            [
                {
                    key: 'bthomedevice:200',
                    status: { paired: true },
                    attrs: { flags: 1, model_id: 9 },
                },
                { key: 'bthomesensor:202', status: { value: 20 } },
            ],
            2,
        );
        await device.refreshBTHomeComponents();

        expect(device.getComponent('bthomedevice:200')).toBe(bthomeDevice);
        expect(bthomeDevice.attrs).toEqual({ flags: 1, model_id: 9 });
        expect(sensor.attrs).toBeUndefined();
        expect(sensor.status.value).toBe(20);
    });

    test('throws rather than looping when pagination stops before the advertised total', async () => {
        const rpc = new TestRpcHandler();
        rpc.request.mockImplementation((_method: string, params?: { offset?: number }) =>
            Promise.resolve(params?.offset === 0 ? page([{ key: 'bthomesensor:1' }], 2) : page([], 2, 1)),
        );
        const device = new TestDevice(info, rpc);

        await expect(device.refreshBTHomeComponents()).rejects.toThrow(/empty page before discovery was complete/);
        expect(device.hasComponent('bthomesensor:1')).toBe(false);
    });

    test('coalesces simultaneous refresh calls', async () => {
        const rpc = new TestRpcHandler();
        let resolveRequest!: (value: ReturnType<typeof page>) => void;
        rpc.request.mockReturnValue(
            new Promise<ReturnType<typeof page>>((resolve) => {
                resolveRequest = resolve;
            }),
        );
        const device = new TestDevice(info, rpc);

        const first = device.refreshBTHomeComponents();
        const second = device.refreshBTHomeComponents();
        expect(rpc.request).toHaveBeenCalledTimes(1);

        resolveRequest(page([{ key: 'bthomesensor:513', status: { value: 24 } }], 1));
        await Promise.all([first, second]);

        expect(device.hasComponent('bthomesensor:513')).toBe(true);
    });

    test('discovers BTHome components on registered ShellyPro3EM subclasses', async () => {
        const rpc = new TestRpcHandler();
        rpc.request.mockImplementation((method: string) =>
            Promise.resolve(
                method === 'Shelly.GetComponents'
                    ? page([{ key: 'bthomesensor:513', status: { value: 24 }, config: { name: 'Kitchen' } }], 1)
                    : {},
            ),
        );
        const device = await createDeviceFromInfo(
            {
                id: 'meter-1',
                mac: 'meter-mac',
                model: ShellyPro3EM.model,
                gen: 2,
                fw_id: 'test',
                ver: '1.0.0',
                app: 'Pro3EM',
                auth_en: false,
                auth_domain: null,
                discoverable: true,
            },
            rpc,
            { seedStatus: { ts: 0 }, autoLoadStatus: false },
        );

        expect(device).toBeInstanceOf(ShellyPro3EM);
        if (!device) {
            throw new Error('Expected ShellyPro3EM to be registered');
        }
        await device.refreshBTHomeComponents();

        expect(device.hasComponent('bthomesensor:513')).toBe(true);
        expect(device.getComponent('bthomesensor:513')).toBeInstanceOf(DynamicComponent);
        expect([...device].map(([key]) => key)).toContain('bthomesensor:513');
    });

    test('applies buffered initial status through an overridden notification handler', () => {
        const device = new StatusOverrideDevice(info, new TestRpcHandler());
        const initial = { ts: 10, 'bthomesensor:513': { value: 24 } };

        device.applyInitialStatus(initial);

        expect(device.initialUpdates).toEqual([initial]);
    });
});
