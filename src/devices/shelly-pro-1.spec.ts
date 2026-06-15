import { Device, ShellyPro1Rev2Ul } from './index';

test('SPSW-201XE15UL resolves to ShellyPro1Rev2Ul', () => {
    expect(Device.getClass('SPSW-201XE15UL')).toBe(ShellyPro1Rev2Ul);
});
