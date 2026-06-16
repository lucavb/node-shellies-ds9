import { Device } from '../devices';
import { applyStatusNotification } from './create-device';

describe('applyStatusNotification', () => {
    it('skips null component payloads', () => {
        const update = vi.fn();
        const device = {
            getComponent: vi.fn((key: string) => (key === 'wifi' ? { update } : undefined)),
        } as unknown as Device;

        applyStatusNotification(device, {
            ts: 1,
            test: null,
            wifi: { connected: true },
        });

        expect(device.getComponent).toHaveBeenCalledWith('wifi');
        expect(update).toHaveBeenCalledWith({ connected: true });
        expect(device.getComponent).not.toHaveBeenCalledWith('test');
    });
});
