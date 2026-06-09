import { Device } from '../devices';
import { RpcHandler } from '../rpc';
import { Rgb } from './rgb';
import { Rgbw } from './rgbw';

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
                profile: 'rgb',
            },
            new TestRpcHandler(),
        );
    }
}

describe('Rgb', () => {
    let device = new TestDevice();
    let component = new Rgb(device, 0);

    beforeEach(() => {
        device = new TestDevice();
        component = new Rgb(device, 0);
    });

    test('updates rgb and apower from status payload', () => {
        const onRgb = vi.fn();
        const onApower = vi.fn();
        component.on('change:rgb', onRgb);
        component.on('change:apower', onApower);

        component.update({
            id: 0,
            source: 'timer',
            output: true,
            rgb: [0, 0, 127],
            brightness: 50,
            apower: 2,
            voltage: 12.1,
            current: 0.165,
            aenergy: { total: 0.55, by_minute: [0, 0, 0], minute_ts: 0 },
        });

        expect(component.rgb).toEqual([0, 0, 127]);
        expect(component.apower).toBe(2);
        expect(onRgb).toHaveBeenCalledWith([0, 0, 127]);
        expect(onApower).toHaveBeenCalledWith(2);
    });
});

describe('Rgbw', () => {
    let device = new TestDevice();
    let component = new Rgbw(device, 0);

    beforeEach(() => {
        device = new TestDevice();
        component = new Rgbw(device, 0);
    });

    test('updates white from status payload', () => {
        const onWhite = vi.fn();
        component.on('change:white', onWhite);

        component.update({
            id: 0,
            source: 'timer',
            output: true,
            rgb: [0, 0, 127],
            brightness: 50,
            white: 50,
            apower: 2,
        });

        expect(component.white).toBe(50);
        expect(onWhite).toHaveBeenCalledWith(50);
    });
});
