import { Device } from '../devices/base';
import { RpcHandler } from '../rpc';
import { RGB, RGBW, type RGBSetResponse } from './rgb';

class TestRpcHandler extends RpcHandler {
    connected = true;
    request = vi.fn().mockResolvedValue({ was_on: true });
    destroy = vi.fn().mockResolvedValue(undefined);

    constructor() {
        super('test');
    }
}

class TestDevice extends Device {
    constructor(readonly handler = new TestRpcHandler()) {
        super({ id: 'rgb-test', mac: '00:00:00:00:00:01' }, handler);
    }
}

describe('RGB lighting components', () => {
    test('uses the exact RPC namespaces and component IDs', async () => {
        const device = new TestDevice();
        const rgbw = new RGBW(device, 2);
        const rgb = new RGB(device, 1);

        const rgbwSetResult: PromiseLike<RGBSetResponse> = rgbw.set({
            on: true,
            brightness: 80,
            rgb: [12, 34, 56],
            white: 40,
            transition_duration: 1.5,
        });
        const rgbwToggleResult: PromiseLike<RGBSetResponse> = rgbw.toggle();
        const rgbSetResult: PromiseLike<RGBSetResponse> = rgb.set({ rgb: [255, 128, 0], transition_duration: 0.5 });
        const rgbToggleResult: PromiseLike<RGBSetResponse> = rgb.toggle();

        await expect(rgbwSetResult).resolves.toEqual({ was_on: true });
        await expect(rgbwToggleResult).resolves.toEqual({ was_on: true });
        await expect(rgbSetResult).resolves.toEqual({ was_on: true });
        await expect(rgbToggleResult).resolves.toEqual({ was_on: true });

        expect(device.handler.request).toHaveBeenNthCalledWith(1, 'RGBW.Set', {
            id: 2,
            on: true,
            brightness: 80,
            rgb: [12, 34, 56],
            white: 40,
            transition_duration: 1.5,
        });
        expect(device.handler.request).toHaveBeenNthCalledWith(2, 'RGBW.Toggle', { id: 2 });
        expect(device.handler.request).toHaveBeenNthCalledWith(3, 'RGB.Set', {
            id: 1,
            rgb: [255, 128, 0],
            transition_duration: 0.5,
        });
        expect(device.handler.request).toHaveBeenNthCalledWith(4, 'RGB.Toggle', { id: 1 });
    });

    test('exposes documented status fields and emits characteristic changes', () => {
        const device = new TestDevice();
        const rgbw = new RGBW(device);
        const rgb = new RGB(device);
        const changes = vi.fn();
        rgbw.on('change', changes);
        const energy = { total: 86.182, by_minute: [0, 0, 0] as [number, number, number], minute_ts: 1779361440 };

        rgbw.update({
            id: 0,
            output: true,
            brightness: 72,
            rgb: [10, 20, 30],
            white: 25,
            temperature: { tC: 54.8, tF: 130.6 },
            aenergy: energy,
            apower: 0,
            current: 0,
            voltage: 12.6,
        });
        rgb.update({ id: 0, rgb: [54, 97, 255], aenergy: energy, apower: 0, current: 0, voltage: 12.6 });

        expect(rgbw.output).toBe(true);
        expect(rgbw.brightness).toBe(72);
        expect(rgbw.rgb).toEqual([10, 20, 30]);
        expect(rgbw.white).toBe(25);
        expect(rgbw.temperature).toEqual({ tC: 54.8, tF: 130.6 });
        expect(rgbw.aenergy).toEqual(energy);
        expect(rgbw.voltage).toBe(12.6);
        expect(rgb.aenergy?.total).toBe(86.182);
        expect(rgb.apower).toBe(0);
        expect(rgbw.key).toBe('rgbw:0');
        expect(changes).toHaveBeenCalledWith('output', true);
        expect(changes).toHaveBeenCalledWith('rgb', [10, 20, 30]);
    });
});
