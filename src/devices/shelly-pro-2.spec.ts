import { Device, ShellyPro2Rev2Ul } from './index';

test('SPSW-202XE12UL resolves to ShellyPro2Rev2Ul', () => {
    expect(Device.getClass('SPSW-202XE12UL')).toBe(ShellyPro2Rev2Ul);
});
