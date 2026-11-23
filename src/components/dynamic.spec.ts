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

    test('exposes valid attrs and ignores absent or malformed metadata updates', () => {
        component.updateAttrs({ flags: 17, model_id: 8 });

        expect(component.attrs).toEqual({ flags: 17, model_id: 8 });

        component.updateAttrs(undefined);
        component.updateAttrs(null);
        component.updateAttrs(['invalid']);
        component.updateAttrs('invalid');

        expect(component.attrs).toEqual({ flags: 17, model_id: 8 });
    });

    test('calls RPC methods with the parsed component name and id', async () => {
        await component.call('Set', { value: true });

        expect(device.rpcHandler.request).toHaveBeenCalledWith('Boolean.Set', {
            value: true,
        });
    });

    test('replaces a previously merged errors array instead of retaining stale elements', () => {
        const change = vi.fn();
        component.on('change:errors', change);

        // Shelly energy meters report the active errors as a complete array.
        component.update({ errors: ['voltage', 'current', 'power'] });
        component.update({ errors: ['current'] });

        expect(component.status.errors).toEqual(['current']);
        expect(Array.isArray(component.status.errors)).toBe(true);
        expect(change).toHaveBeenLastCalledWith(['current']);
    });

    test('an empty array clears a previously populated array value', () => {
        component.update({ errors: ['voltage'] });
        component.update({ errors: [] });

        expect(component.status.errors).toEqual([]);
    });

    test('replaces an index-keyed object left by the old merge with the incoming array', () => {
        // The pre-fix merge produced numeric-keyed objects like this one; an
        // incoming array must replace it rather than merge into it.
        component.update({ errors: { 0: 'voltage', 1: 'current' } });
        const change = vi.fn();
        component.on('change:errors', change);

        component.update({ errors: ['current'] });

        expect(component.status.errors).toEqual(['current']);
        expect(Array.isArray(component.status.errors)).toBe(true);
        expect(change).toHaveBeenLastCalledWith(['current']);

        // The reverse boundary: a stored array is also a complete value and is
        // replaced by an incoming object.
        component.update({ errors: { message: 'ok' } });

        expect(component.status.errors).toEqual({ message: 'ok' });
    });

    test('does not emit change:errors for an identical array', () => {
        component.update({ errors: ['voltage'] });
        const change = vi.fn();
        const fieldChange = vi.fn();
        component.on('change', change);
        component.on('change:errors', fieldChange);

        component.update({ errors: ['voltage'] });

        expect(change).not.toHaveBeenCalled();
        expect(fieldChange).not.toHaveBeenCalled();
    });

    test('still merges top-level object fields while arrays stay complete values', () => {
        // Mixed payload: scalar and nested object fields merge across partial
        // notifications, the top-level array does not.
        component.update({
            id: 0,
            errors: ['voltage', 'current'],
            details: { model: 'plus-1pm', channel: 0 },
        });
        component.update({
            errors: ['power'],
            details: { channel: 1 },
        });

        expect(component.status).toEqual({
            id: 0,
            errors: ['power'],
            details: { model: 'plus-1pm', channel: 1 },
        });
    });

    test('emits change:config with previous and current config on assignment', () => {
        const listener = vi.fn();
        component.on('change:config', listener);

        component.config = { name: 'Kitchen' };
        component.config = { name: 'Office' };

        expect(listener).toHaveBeenNthCalledWith(1, { name: 'Kitchen' }, undefined, undefined);
        expect(listener).toHaveBeenNthCalledWith(2, { name: 'Office' }, { name: 'Kitchen' }, undefined);
    });

    test('does not emit change:config when the assigned config is identical', () => {
        const listener = vi.fn();
        component.on('change:config', listener);
        const config = { name: 'Kitchen' };
        component.config = config;

        component.config = config;
        component.config = { name: 'Kitchen' };

        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('supports listener context on change:config', () => {
        const context = { seen: 0 };
        component.on(
            'change:config',
            function (this: { seen: number }) {
                this.seen++;
            },
            context,
        );

        component.config = { name: 'Kitchen' };

        expect(context.seen).toBe(1);
    });

    test('correlates a config assignment with the status update it arrived with', () => {
        const listener = vi.fn();
        component.on('change:config', listener);

        // This is the Shelly.GetComponents shape: status then config in one turn.
        component.update({ current_C: 21, rsv: 3 });
        component.config = { addr: 'aa:bb:cc:dd:ee:ff' };

        expect(listener).toHaveBeenCalledWith({ addr: 'aa:bb:cc:dd:ee:ff' }, undefined, { current_C: 21, rsv: 3 });
        expect(component.pendingUpdate).toEqual({ current_C: 21, rsv: 3 });
    });

    test('correlation carries the raw update payload, not the merged status', () => {
        component.update({ current_C: 21, target_C: 25, pos: 50, paired: true });
        const listener = vi.fn();
        component.on('change:config', listener);

        // A partial update must stay partial: the consumer's completeness check
        // requires the raw payload's own fields, never the accumulated status.
        component.update({ rsv: 4 });
        component.config = { addr: 'aa:bb:cc:dd:ee:ff' };

        expect(listener).toHaveBeenCalledWith({ addr: 'aa:bb:cc:dd:ee:ff' }, undefined, { rsv: 4 });
        expect(component.pendingUpdate).toEqual({ rsv: 4 });
    });

    test('exposes updateDepth and pendingUpdate to change listeners, then clears pendingUpdate', async () => {
        const depths: number[] = [];
        const pending: Array<Readonly<Record<string, unknown>> | undefined> = [];
        component.on('change:value', () => {
            depths.push(component.updateDepth);
            pending.push(component.pendingUpdate);
        });

        component.update({ value: true });

        expect(depths).toEqual([1]);
        expect(pending).toEqual([{ value: true }]);
        expect(component.updateDepth).toBe(0);
        expect(component.pendingUpdate).toEqual({ value: true });

        await Promise.resolve();

        expect(component.pendingUpdate).toBeUndefined();
    });

    test('delivers every change from nested/reentrant updates without swallowing events', () => {
        const outer = vi.fn();
        const inner = vi.fn();
        const depths: number[] = [];

        component.on('change:outer', (value) => {
            outer(value);
            depths.push(component.updateDepth);
            if (value === 1) {
                component.update({ inner: 1 });
            }
        });
        component.on('change:inner', (value) => {
            inner(value);
            depths.push(component.updateDepth);
        });

        component.update({ outer: 1 });

        expect(outer).toHaveBeenCalledWith(1);
        expect(inner).toHaveBeenCalledWith(1);
        expect(depths).toEqual([1, 2]);
        expect(component.updateDepth).toBe(0);
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
