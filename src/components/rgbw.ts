import { characteristic, ComponentWithId } from './base';
import { Device } from '../devices';
import { RgbAttributes, RgbConfig } from './rgb';
import { SwitchEnergyCounterAttributes, SwitchTemperatureAttributes } from './switch';

export interface RgbwAttributes extends RgbAttributes {
    white: number;
}

export interface RgbwConfig extends RgbConfig {
    night_mode: RgbConfig['night_mode'] & {
        white: number | null;
    };
}

/**
 * Handles an RGBW LED output with color, white, and brightness control.
 */
export class Rgbw extends ComponentWithId<RgbwAttributes, RgbwConfig> implements RgbwAttributes {
    @characteristic
    readonly source: string = '';

    @characteristic
    readonly output: boolean = false;

    @characteristic
    readonly brightness: number = 0;

    @characteristic
    readonly rgb: number[] = [0, 0, 0];

    @characteristic
    readonly white: number = 0;

    @characteristic
    readonly timer_started_at: number | undefined;

    @characteristic
    readonly timer_duration: number | undefined;

    @characteristic
    readonly apower: number | undefined;

    @characteristic
    readonly voltage: number | undefined;

    @characteristic
    readonly current: number | undefined;

    @characteristic
    readonly aenergy: SwitchEnergyCounterAttributes | undefined;

    @characteristic
    readonly temperature: SwitchTemperatureAttributes | undefined;

    @characteristic
    readonly errors: string[] | undefined;

    constructor(device: Device, id = 0) {
        super('RGBW', device, id);
    }

    toggle(): PromiseLike<null> {
        return this.rpc<null>('Toggle', {
            id: this.id,
        });
    }

    set(on?: boolean, brightness?: number, rgb?: number[], white?: number, toggle_after?: number): PromiseLike<null> {
        return this.rpc<null>('Set', {
            id: this.id,
            on,
            brightness,
            rgb,
            white,
            toggle_after,
        });
    }
}
