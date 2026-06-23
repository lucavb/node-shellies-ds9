import { Device } from '../devices/base';
import { RpcHandler } from '../rpc';
import { Switch } from './switch';
import { Cover } from './cover';
import { WiFi } from './wifi';
import { DynamicComponent } from './dynamic';
import { Humidity } from './humidity';
import { createComponent } from './factory';
import { Temperature } from './temperature';

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

describe('createComponent', () => {
    let device = new TestDevice();

    beforeEach(() => {
        device = new TestDevice();
    });

    test('creates typed switch components', () => {
        const component = createComponent(device, {
            key: 'switch:0',
            status: { output: true },
        });

        expect(component).toBeInstanceOf(Switch);
        expect(component.key).toBe('switch:0');
        expect((component as Switch).output).toBe(true);
    });

    test('creates typed cover components', () => {
        const component = createComponent(device, {
            key: 'cover:0',
        });

        expect(component).toBeInstanceOf(Cover);
    });

    test('creates typed service components', () => {
        const component = createComponent(device, {
            key: 'wifi',
        });

        expect(component).toBeInstanceOf(WiFi);
    });

    test('creates typed temperature components for add-on ids', () => {
        const component = createComponent(device, {
            key: 'temperature:101',
            status: { id: 101, tC: 24.4 },
        });

        expect(component).toBeInstanceOf(Temperature);
        expect(component.key).toBe('temperature:101');
        expect((component as Temperature).tC).toBe(24.4);
    });

    test('creates typed humidity components for add-on ids', () => {
        const component = createComponent(device, {
            key: 'humidity:100',
            status: { id: 100, rh: 73.7 },
        });

        expect(component).toBeInstanceOf(Humidity);
        expect(component.key).toBe('humidity:100');
        expect((component as Humidity).rh).toBe(73.7);
    });

    test('creates dynamic components for unknown keys', () => {
        const component = createComponent(device, {
            key: 'boolean:200',
            status: { value: true },
        });

        expect(component).toBeInstanceOf(DynamicComponent);
        expect(component.key).toBe('boolean:200');
    });

    test('reuses the device system component for sys', () => {
        const component = createComponent(device, {
            key: 'sys',
            status: { uptime: 42 },
        });

        expect(component).toBe(device.system);
    });
});
