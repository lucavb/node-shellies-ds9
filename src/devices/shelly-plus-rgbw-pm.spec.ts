import { Device, ShellyPlusRgbwPm } from './index';

test('SNDC-0D4P10WW resolves to ShellyPlusRgbwPm', () => {
    expect(Device.getClass('SNDC-0D4P10WW')).toBe(ShellyPlusRgbwPm);
});
