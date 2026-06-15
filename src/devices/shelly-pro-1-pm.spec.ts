import { Device, ShellyPro1PmRev2Ul } from './index';

test('SPSW-201PE15UL resolves to ShellyPro1PmRev2Ul', () => {
    expect(Device.getClass('SPSW-201PE15UL')).toBe(ShellyPro1PmRev2Ul);
});
