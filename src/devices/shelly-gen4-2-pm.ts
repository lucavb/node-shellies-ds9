import { Device } from './base';
import { ShellyGen32Pm } from './shelly-gen3-2-pm';

export class ShellyGen42Pm extends ShellyGen32Pm {
    static readonly model: string = 'S4SW-002P16EU';
    static readonly modelName: string = 'Shelly 2PM Gen4';
}

Device.registerClass(ShellyGen42Pm);
