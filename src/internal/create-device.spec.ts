import { Device } from '../devices';
import { ComponentLike } from '../components';
import { RpcHandler } from '../rpc';
import { applyStatusNotification } from './create-device';

class TestDevice extends Device {}

describe('applyStatusNotification', () => {
    it('skips null component payloads', () => {
        const update = vi.fn();
        const handler = { on: vi.fn() } as unknown as RpcHandler;
        const device = new TestDevice({ id: 'test', mac: 'test' }, handler);
        const getComponent = vi
            .spyOn(device, 'getComponent')
            .mockImplementation((key) => (key === 'wifi' ? ({ update } as unknown as ComponentLike) : undefined));

        applyStatusNotification(device, {
            ts: 1,
            test: null,
            wifi: { connected: true },
        });

        expect(getComponent).toHaveBeenCalledWith('wifi');
        expect(update).toHaveBeenCalledWith({ connected: true });
        expect(getComponent).not.toHaveBeenCalledWith('test');
    });
});
