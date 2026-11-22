import { DynamicComponent } from '../components';
import { RpcHandler } from '../rpc';
import { ShellyBluGatewayGen3 } from './shelly-blu-gateway';
import { createDeviceFromInfo } from '../internal/create-device';
import { GenericDevice } from './generic';

class TestRpcHandler extends RpcHandler {
    constructor() {
        super('test');
    }

    connected = true;
    request = vi.fn();
    destroy = vi.fn().mockResolvedValue(undefined);
}

const info = {
    id: 'gateway-1',
    mac: 'gateway-mac',
    model: 'S3GW-1DBT001',
    gen: 3,
    fw_id: 'test',
    ver: '1.0.0',
    app: 'BluGw',
    auth_en: false,
    auth_domain: null,
    discoverable: true,
};

function componentsPage(
    components: Array<{ key: string; status?: Record<string, unknown> }>,
    total: number,
    offset = 0,
) {
    return { components, cfg_rev: 1, offset, total };
}

describe('ShellyBluGatewayGen3', () => {
    test('supports a gateway with no paired TRVs', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockResolvedValue(componentsPage([{ key: 'blugw' }], 1));

        const device = (await createDeviceFromInfo(info, rpcHandler)) as ShellyBluGatewayGen3;

        expect(device.hasComponent('blugw')).toBe(true);
        expect(device.hasComponent('blutrv:0')).toBe(false);
    });

    test('inherits BTHome refresh behavior through the gateway runtime inventory', async () => {
        const rpcHandler = new TestRpcHandler();
        let components: Array<{ key: string }> = [];
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                return Promise.resolve(componentsPage(components, components.length));
            }
            return Promise.resolve({});
        });

        const device = (await createDeviceFromInfo(info, rpcHandler)) as ShellyBluGatewayGen3;
        components = [{ key: 'bthomedevice:12' }, { key: 'bthomesensor:19' }];

        await device.refreshBTHomeComponents();

        expect(device.hasComponent('bthomedevice:12')).toBe(true);
        expect(device.hasComponent('bthomesensor:19')).toBe(true);
    });

    test('is initialized by the typed factory and discovers paginated BLU components', async () => {
        const rpcHandler = new TestRpcHandler();
        rpcHandler.request.mockImplementation((method: string, params?: { offset?: number }) => {
            if (method === 'Shelly.GetComponents' && params?.offset === 0) {
                return Promise.resolve(
                    componentsPage(
                        [
                            { key: 'blugw', status: { connected: true } },
                            { key: 'blutrv:12', status: { online: true, temperature: 21 } },
                        ],
                        3,
                    ),
                );
            }
            if (method === 'Shelly.GetComponents' && params?.offset === 2) {
                return Promise.resolve(componentsPage([{ key: 'blutrv:49', status: { online: false } }], 3, 2));
            }
            return Promise.resolve({});
        });

        const device = await createDeviceFromInfo(info, rpcHandler);

        expect(device).toBeInstanceOf(ShellyBluGatewayGen3);
        expect(device).toBeInstanceOf(GenericDevice);
        expect(device?.modelName).toBe('Shelly BLU Gateway Gen3');
        expect(device?.hasComponent('blutrv:12')).toBe(true);
        expect(device?.hasComponent('blutrv:49')).toBe(true);
        expect(device?.getComponent('blutrv:12')).toBeInstanceOf(DynamicComponent);
        expect(rpcHandler.request).toHaveBeenNthCalledWith(1, 'Shelly.GetComponents', {
            offset: 0,
            include: ['status', 'config'],
        });
        expect(rpcHandler.request).toHaveBeenNthCalledWith(2, 'Shelly.GetComponents', {
            offset: 2,
            include: ['status', 'config'],
        });
    });

    test('reconciles additions/removals while retaining component identity and routes notifications', async () => {
        const rpcHandler = new TestRpcHandler();
        let discovery = 0;
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                discovery++;
                if (discovery === 1) {
                    return Promise.resolve(
                        componentsPage(
                            [
                                { key: 'blutrv:12', status: { online: true, temperature: 20 } },
                                { key: 'blutrv:49', status: { online: true } },
                            ],
                            2,
                        ),
                    );
                }
                return Promise.resolve(
                    componentsPage(
                        [
                            { key: 'blutrv:12', status: { online: true, temperature: 21 } },
                            { key: 'blutrv:88', status: { online: true } },
                        ],
                        2,
                    ),
                );
            }
            return Promise.resolve({});
        });

        const device = (await createDeviceFromInfo(info, rpcHandler)) as ShellyBluGatewayGen3;
        const trv = device.getComponent('blutrv:12');
        const update = vi.fn();
        trv?.on('change:temperature', update);

        rpcHandler.emit('statusUpdate', { ts: 1, 'blutrv:12': { temperature: 22 } });
        expect((trv as DynamicComponent).status.temperature).toBe(22);
        expect(update).toHaveBeenCalledWith(22);

        await device.rediscoverComponents();

        expect(device.getComponent('blutrv:12')).toBe(trv);
        expect(device.hasComponent('blutrv:49')).toBe(false);
        expect(device.hasComponent('blutrv:88')).toBe(true);
    });

    test('rediscovers on lifecycle events and supports the known proxied TRV RPC contract', async () => {
        const rpcHandler = new TestRpcHandler();
        let componentInventory = [{ key: 'blutrv:4' }];
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                return Promise.resolve(componentsPage(componentInventory, componentInventory.length));
            }
            return Promise.resolve({ ok: true });
        });

        const device = (await createDeviceFromInfo(info, rpcHandler)) as ShellyBluGatewayGen3;
        const trv = device.getComponent('blutrv:4') as DynamicComponent;
        const eventListener = vi.fn();
        trv.on('event', eventListener);

        rpcHandler.emit('event', {
            ts: 1,
            events: [{ component: 'blutrv', id: 4, event: 'updated', ts: 1 }],
        });
        expect(eventListener).toHaveBeenCalledWith(expect.objectContaining({ event: 'updated', id: 4 }));
        expect(rpcHandler.request).toHaveBeenCalledTimes(1);

        componentInventory = [{ key: 'blutrv:9' }];
        rpcHandler.emit('event', {
            ts: 2,
            events: [{ component: 'sys', event: 'config_changed', ts: 2 }],
        });
        await vi.waitFor(() => expect(device.hasComponent('blutrv:9')).toBe(true));
        expect(device.hasComponent('blutrv:4')).toBe(false);
        expect(rpcHandler.request).toHaveBeenCalledTimes(2);

        await device.callTrv(9, 'GetStatus');
        expect(rpcHandler.request).toHaveBeenLastCalledWith('BluTrv.Call', {
            id: 9,
            method: 'GetStatus',
            params: undefined,
        });
    });

    test('uses the component snapshot instead of replaying an older unknown-component notification', async () => {
        const rpcHandler = new TestRpcHandler();
        let pendingSnapshot: ((page: ReturnType<typeof componentsPage>) => void) | undefined;
        let discoveries = 0;
        rpcHandler.request.mockImplementation((method: string) => {
            if (method !== 'Shelly.GetComponents') {
                return Promise.resolve({});
            }
            discoveries++;
            if (discoveries === 1) {
                return Promise.resolve(componentsPage([], 0));
            }
            return new Promise((resolve) => {
                pendingSnapshot = resolve;
            });
        });

        const device = (await createDeviceFromInfo(info, rpcHandler)) as ShellyBluGatewayGen3;
        rpcHandler.emit('statusUpdate', { ts: 1, 'blutrv:7': { temperature: 18 } });
        await vi.waitFor(() => expect(pendingSnapshot).toBeDefined());

        pendingSnapshot?.(componentsPage([{ key: 'blutrv:7', status: { temperature: 22 } }], 1));
        await vi.waitFor(() => expect(device.hasComponent('blutrv:7')).toBe(true));

        expect((device.getComponent('blutrv:7') as DynamicComponent).status.temperature).toBe(22);
        expect(discoveries).toBe(2);
    });

    test('starts a trailing scan when an unknown component arrives during a manual discovery', async () => {
        const rpcHandler = new TestRpcHandler();
        const pendingSnapshots: Array<(page: ReturnType<typeof componentsPage>) => void> = [];
        let discoveries = 0;
        rpcHandler.request.mockImplementation((method: string) => {
            if (method !== 'Shelly.GetComponents') {
                return Promise.resolve({});
            }
            discoveries++;
            if (discoveries === 1) {
                return Promise.resolve(componentsPage([], 0));
            }
            return new Promise((resolve) => pendingSnapshots.push(resolve));
        });

        const device = (await createDeviceFromInfo(info, rpcHandler)) as ShellyBluGatewayGen3;
        const manualDiscovery = device.rediscoverComponents();
        await vi.waitFor(() => expect(pendingSnapshots).toHaveLength(1));

        rpcHandler.emit('statusUpdate', { ts: 1, 'blutrv:12': { temperature: 15 } });
        pendingSnapshots[0](componentsPage([], 0));
        await manualDiscovery;

        await vi.waitFor(() => expect(pendingSnapshots).toHaveLength(2));
        pendingSnapshots[1](componentsPage([{ key: 'blutrv:12', status: { temperature: 27 } }], 1));

        await vi.waitFor(() => expect(device.hasComponent('blutrv:12')).toBe(true));
        expect((device.getComponent('blutrv:12') as DynamicComponent).status.temperature).toBe(27);
        expect(discoveries).toBe(3); // initial, manually-started, and required trailing scan
    });

    test('coalesces unknown notifications during discovery into one follow-up and handles scan failures', async () => {
        const rpcHandler = new TestRpcHandler();
        const pendingSnapshots: Array<(page: ReturnType<typeof componentsPage>) => void> = [];
        let discoveries = 0;
        rpcHandler.request.mockImplementation((method: string) => {
            if (method !== 'Shelly.GetComponents') {
                return Promise.resolve({});
            }
            discoveries++;
            if (discoveries === 1) {
                return Promise.resolve(componentsPage([], 0));
            }
            return new Promise((resolve) => pendingSnapshots.push(resolve));
        });

        const device = (await createDeviceFromInfo(info, rpcHandler)) as ShellyBluGatewayGen3;
        rpcHandler.emit('statusUpdate', { ts: 1, 'blutrv:2': { temperature: 5 } });
        await vi.waitFor(() => expect(pendingSnapshots).toHaveLength(1));

        rpcHandler.emit('statusUpdate', { ts: 2, 'blutrv:3': { temperature: 6 } });
        rpcHandler.emit('statusUpdate', { ts: 3, 'blutrv:3': { temperature: 7 } });
        expect(pendingSnapshots).toHaveLength(1);

        pendingSnapshots[0](componentsPage([{ key: 'blutrv:2', status: { temperature: 20 } }], 1));
        await vi.waitFor(() => expect(pendingSnapshots).toHaveLength(2));
        pendingSnapshots[1](
            componentsPage(
                [
                    { key: 'blutrv:2', status: { temperature: 21 } },
                    { key: 'blutrv:3', status: { temperature: 30 } },
                ],
                2,
            ),
        );

        await vi.waitFor(() => expect(device.hasComponent('blutrv:3')).toBe(true));
        expect(discoveries).toBe(3); // initial discovery plus two coalesced scans
        expect((device.getComponent('blutrv:2') as DynamicComponent).status.temperature).toBe(21);
        expect((device.getComponent('blutrv:3') as DynamicComponent).status.temperature).toBe(30);

        // A later fire-and-forget discovery failure is surfaced as a device event
        // and does not leave an unhandled rejection or a stuck in-flight marker.
        const discoveryError = vi.fn();
        device.on('componentDiscoveryError', discoveryError);
        rpcHandler.request.mockImplementation((method: string) => {
            if (method === 'Shelly.GetComponents') {
                return Promise.reject(new Error('temporary discovery failure'));
            }
            return Promise.resolve({});
        });
        rpcHandler.emit('statusUpdate', { ts: 4, 'blutrv:4': { temperature: 8 } });
        await vi.waitFor(() => expect(discoveryError).toHaveBeenCalledTimes(1));
    });
});
