import { Temperature, Humidity } from '../components';
import { component, Device } from './base';
import { RpcHandler } from '../rpc';

class TestRpcHandler extends RpcHandler {
    constructor() {
        super('test');
    }

    connected = true;
    request = vi.fn().mockResolvedValue({ success: true });
    destroy = vi.fn().mockImplementation(() => Promise.resolve());
}

class TestDevice extends Device {
    @component
    readonly systemComponent = this.system;

    constructor(readonly rpcHandler: TestRpcHandler) {
        super(
            {
                id: 'shellyplus1pm-abc123',
                mac: 'abc123',
            },
            rpcHandler,
        );
    }
}

describe('Device add-on sensors', () => {
    test('discovers temperature and humidity components from status/config', async () => {
        const rpcHandler = new TestRpcHandler();
        const device = new TestDevice(rpcHandler);

        vi.spyOn(device.shelly, 'getStatus').mockResolvedValue({
            'switch:0': { id: 0, output: false },
            'temperature:100': { id: 100, tC: 21.5 },
            'temperature:101': { id: 101, tC: 22.0 },
            'humidity:100': { id: 100, rh: 48.2 },
        });
        vi.spyOn(device.shelly, 'getConfig').mockResolvedValue({
            'temperature:100': { id: 100, name: 'Probe 1' },
            'temperature:101': { id: 101, name: null },
            'humidity:100': { id: 100, name: null },
        });

        await device.discoverAddonComponents();

        expect(device.hasComponent('temperature:100')).toBe(true);
        expect(device.hasComponent('temperature:101')).toBe(true);
        expect(device.hasComponent('humidity:100')).toBe(true);
        expect(device.getComponent('temperature:100')).toBeInstanceOf(Temperature);
        expect(device.getComponent('humidity:100')).toBeInstanceOf(Humidity);
        expect((device.getComponent('temperature:100') as Temperature).tC).toBe(21.5);
    });

    test('registers add-on components lazily from status updates', () => {
        const rpcHandler = new TestRpcHandler();
        const device = new TestDevice(rpcHandler);

        device['statusUpdateHandler']({
            ts: 1,
            'temperature:102': { id: 102, tC: 19.8 },
        });

        expect(device.hasComponent('temperature:102')).toBe(true);
        expect((device.getComponent('temperature:102') as Temperature).tC).toBe(19.8);
    });

    test('iterates add-on components with static components', async () => {
        const rpcHandler = new TestRpcHandler();
        const device = new TestDevice(rpcHandler);

        vi.spyOn(device.shelly, 'getStatus').mockResolvedValue({
            'temperature:100': { id: 100, tC: 20 },
        });
        vi.spyOn(device.shelly, 'getConfig').mockResolvedValue({});

        await device.discoverAddonComponents();

        const keys = [...device].map(([key]) => key);
        expect(keys).toContain('sys');
        expect(keys).toContain('temperature:100');
    });
});
