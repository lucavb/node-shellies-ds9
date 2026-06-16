import { Device } from '../devices/base';
import { RpcHandler } from '../rpc';
import { Switch } from './switch';
import { Cover } from './cover';
import { WiFi } from './wifi';
import { DynamicComponent } from './dynamic';
import { createComponent } from './factory';

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
