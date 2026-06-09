import { Device, ShellyPro4PmV3 } from './index';

test('SPSW-204PE16EU resolves to ShellyPro4PmV3', () => {
    expect(Device.getClass('SPSW-204PE16EU')).toBe(ShellyPro4PmV3);
});
