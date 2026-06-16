import { Device } from '../devices/base';
import { RpcHandler } from '../rpc';
import { DynamicComponent } from './dynamic';
import { parseComponentKey } from './key-mapping';

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

describe('DynamicComponent', () => {
    let device = new TestDevice();
    let component = new DynamicComponent(device, parseComponentKey('boolean:200'));

    beforeEach(() => {
        device = new TestDevice();
        component = new DynamicComponent(device, parseComponentKey('boolean:200'));
    });

    test('emits change events when status is updated', () => {
        const listener = vi.fn();
        component.on('change', listener);

        component.update({ value: true });

        expect(listener).toHaveBeenCalledWith('value', true);
        expect(component.status.value).toBe(true);
    });

    test('emits field-specific change events', () => {
        const listener = vi.fn();
        component.on('change:value', listener);

        component.update({ value: false });

        expect(listener).toHaveBeenCalledWith(false);
    });

    test('calls RPC methods with the parsed component name and id', async () => {
        await component.call('Set', { value: true });

        expect(device.rpcHandler.request).toHaveBeenCalledWith('Boolean.Set', {
            value: true,
        });
    });

    test('passes id to GetStatus for keyed components', () => {
        component.getStatus();

        expect(device.rpcHandler.request).toHaveBeenCalledWith('Boolean.GetStatus', {
            id: 200,
        });
    });

    test('passes id to SetConfig', () => {
        component.setConfig({ name: 'test' });

        expect(device.rpcHandler.request).toHaveBeenCalledWith('Boolean.SetConfig', {
            id: 200,
            config: { name: 'test' },
        });
    });
});
