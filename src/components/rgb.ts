import { characteristic, ComponentWithId } from './base';
import { Device } from '../devices';
import { SwitchEnergyCounterAttributes, SwitchTemperatureAttributes } from './switch';

export interface RgbAttributes {
    id: number;
    source: string;
    output: boolean;
    brightness: number;
    rgb: number[];
    timer_started_at?: number;
    timer_duration?: number;
    apower?: number;
    voltage?: number;
    current?: number;
    aenergy?: SwitchEnergyCounterAttributes;
    temperature?: SwitchTemperatureAttributes;
    errors?: string[];
}

export interface RgbConfig {
    id: number;
    name: string | null;
    in_mode: string;
    initial_state: 'off' | 'on' | 'restore_last';
    auto_on: boolean;
    auto_on_delay: number;
    auto_off: boolean;
    auto_off_delay: number;
    transition_duration: number;
    min_brightness_on_toggle: number;
    night_mode: {
        enable: boolean;
        brightness: number | null;
        rgb: number[] | null;
        active_between?: string[];
    };
    button_fade_rate: number;
}

/**
 * Handles an RGB LED output with color and brightness control.
 */
export class Rgb extends ComponentWithId<RgbAttributes, RgbConfig> implements RgbAttributes {
    @characteristic
    readonly source: string = '';

    @characteristic
    readonly output: boolean = false;

    @characteristic
    readonly brightness: number = 0;

    @characteristic
    readonly rgb: number[] = [0, 0, 0];

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
        super('RGB', device, id);
    }

    toggle(): PromiseLike<null> {
        return this.rpc<null>('Toggle', {
            id: this.id,
        });
    }

    set(on?: boolean, brightness?: number, rgb?: number[], toggle_after?: number): PromiseLike<null> {
        return this.rpc<null>('Set', {
            id: this.id,
            on,
            brightness,
            rgb,
            toggle_after,
        });
    }
}
