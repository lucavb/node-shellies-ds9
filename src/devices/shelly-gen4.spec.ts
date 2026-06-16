import {
    Device,
    ShellyGen4One,
    ShellyGen4OneAnz,
    ShellyGen4OneMini,
    ShellyGen4OnePm,
    ShellyGen4OnePmAnz,
    ShellyGen42Pm,
    ShellyGen42PmAnz,
    ShellyOutdoorPlugSG3Eu,
    ShellyPlugAzG3Eu,
    ShellyPlugMG3Eu,
    ShellyPlugPmG3Eu,
    ShellyPlugUsG4,
    ShellyPlusI4Dc,
    ShellyPowerStrip4G4,
    ShellyPowerStrip4G4Black,
} from './index';

test('S4SW-001X16EU resolves to ShellyGen4One', () => {
    expect(Device.getClass('S4SW-001X16EU')).toBe(ShellyGen4One);
});

test('S4SW-001P16EU resolves to ShellyGen4OnePm', () => {
    expect(Device.getClass('S4SW-001P16EU')).toBe(ShellyGen4OnePm);
});

test('S4SW-001X8EU resolves to ShellyGen4OneMini', () => {
    expect(Device.getClass('S4SW-001X8EU')).toBe(ShellyGen4OneMini);
});

test('S4SW-002P16EU resolves to ShellyGen42Pm', () => {
    expect(Device.getClass('S4SW-002P16EU')).toBe(ShellyGen42Pm);
});

test('S4SW-001X16ANZ resolves to ShellyGen4OneAnz', () => {
    expect(Device.getClass('S4SW-001X16ANZ')).toBe(ShellyGen4OneAnz);
});

test('S4SW-001P16ANZ resolves to ShellyGen4OnePmAnz', () => {
    expect(Device.getClass('S4SW-001P16ANZ')).toBe(ShellyGen4OnePmAnz);
});

test('S4SW-002P16ANZ resolves to ShellyGen42PmAnz', () => {
    expect(Device.getClass('S4SW-002P16ANZ')).toBe(ShellyGen42PmAnz);
});

test('S4PL-00116US resolves to ShellyPlugUsG4', () => {
    expect(Device.getClass('S4PL-00116US')).toBe(ShellyPlugUsG4);
});

test('S4PL-00416EU resolves to ShellyPowerStrip4G4', () => {
    expect(Device.getClass('S4PL-00416EU')).toBe(ShellyPowerStrip4G4);
});

test('S4PL-10416EU resolves to ShellyPowerStrip4G4Black', () => {
    expect(Device.getClass('S4PL-10416EU')).toBe(ShellyPowerStrip4G4Black);
});

test('S3PL-10112EU resolves to ShellyPlugAzG3Eu', () => {
    expect(Device.getClass('S3PL-10112EU')).toBe(ShellyPlugAzG3Eu);
});

test('S3PL-20112EU resolves to ShellyOutdoorPlugSG3Eu', () => {
    expect(Device.getClass('S3PL-20112EU')).toBe(ShellyOutdoorPlugSG3Eu);
});

test('S3PL-30110EU resolves to ShellyPlugMG3Eu', () => {
    expect(Device.getClass('S3PL-30110EU')).toBe(ShellyPlugMG3Eu);
});

test('S3PL-30116EU resolves to ShellyPlugPmG3Eu', () => {
    expect(Device.getClass('S3PL-30116EU')).toBe(ShellyPlugPmG3Eu);
});

test('SNSN-0D24X resolves to ShellyPlusI4Dc', () => {
    expect(Device.getClass('SNSN-0D24X')).toBe(ShellyPlusI4Dc);
});
