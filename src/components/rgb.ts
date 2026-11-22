import { characteristic, ComponentWithId } from './base';
import { Device } from '../devices';

/** RGB colour channels, each expressed as an integer from 0 to 255. */
export type RGBColor = [red: number, green: number, blue: number];

/** Per-minute and cumulative active-energy data reported by RGB outputs. */
export interface RGBActiveEnergy {
    total: number;
    by_minute: [number, number, number];
    minute_ts: number;
}

/** Temperature reading reported by the RGB/RGBW output. */
export interface RGBTemperature {
    tC: number;
    tF: number;
}

/** Response returned when an RGB or RGBW output is set or toggled. */
export interface RGBSetResponse {
    was_on: boolean;
}

/** Status reported by the RGBW component. */
export interface RGBWAttributes {
    id: number;
    source?: string;
    output?: boolean;
    brightness?: number;
    rgb?: RGBColor;
    white?: number;
    temperature?: RGBTemperature;
    voltage?: number;
    aenergy?: RGBActiveEnergy;
    apower?: number;
    current?: number;
    timer_started_at?: number;
    timer_duration?: number;
}

/** Status reported by the RGB component. */
export interface RGBAttributes {
    id: number;
    source?: string;
    output?: boolean;
    brightness?: number;
    rgb?: RGBColor;
    temperature?: RGBTemperature;
    aenergy?: RGBActiveEnergy;
    apower?: number;
    current?: number;
    voltage?: number;
    timer_started_at?: number;
    timer_duration?: number;
}

/** Parameters accepted by RGBW.Set; `rgb` can be set without `on` or `brightness`. */
export interface RGBWSetParams {
    on?: boolean;
    brightness?: number;
    rgb?: RGBColor;
    white?: number;
    transition_duration?: number;
}

/** Parameters accepted by RGB.Set; `rgb` can be set without `on` or `brightness`. */
export interface RGBSetParams {
    on?: boolean;
    brightness?: number;
    rgb?: RGBColor;
    transition_duration?: number;
}

type RGBConfig = Record<string, unknown>;

/** Controls an RGBW output, available when the device is using its `rgbw` profile. */
export class RGBW extends ComponentWithId<RGBWAttributes, RGBConfig> implements RGBWAttributes {
    @characteristic
    readonly source: string | undefined;
    @characteristic
    readonly output: boolean | undefined;
    @characteristic
    readonly brightness: number | undefined;
    @characteristic
    readonly rgb: RGBColor | undefined;
    @characteristic
    readonly white: number | undefined;
    @characteristic
    readonly temperature: RGBTemperature | undefined;
    @characteristic
    readonly voltage: number | undefined;
    @characteristic
    readonly aenergy: RGBActiveEnergy | undefined;
    @characteristic
    readonly apower: number | undefined;
    @characteristic
    readonly current: number | undefined;
    @characteristic
    readonly timer_started_at: number | undefined;
    @characteristic
    readonly timer_duration: number | undefined;

    constructor(device: Device, id = 0) {
        super('RGBW', device, id);
    }

    /** Toggles the output. */
    toggle(): PromiseLike<RGBSetResponse> {
        return this.rpc<RGBSetResponse>('Toggle', { id: this.id });
    }

    /** Sets RGBW output state, colour, brightness, and optional transition duration. */
    set(params: RGBWSetParams): PromiseLike<RGBSetResponse> {
        return this.rpc<RGBSetResponse>('Set', { id: this.id, ...params });
    }
}

/** Controls an RGB output, available when the device is using its `rgb` profile. */
export class RGB extends ComponentWithId<RGBAttributes, RGBConfig> implements RGBAttributes {
    @characteristic
    readonly source: string | undefined;
    @characteristic
    readonly output: boolean | undefined;
    @characteristic
    readonly brightness: number | undefined;
    @characteristic
    readonly rgb: RGBColor | undefined;
    @characteristic
    readonly temperature: RGBTemperature | undefined;
    @characteristic
    readonly aenergy: RGBActiveEnergy | undefined;
    @characteristic
    readonly apower: number | undefined;
    @characteristic
    readonly current: number | undefined;
    @characteristic
    readonly voltage: number | undefined;
    @characteristic
    readonly timer_started_at: number | undefined;
    @characteristic
    readonly timer_duration: number | undefined;

    constructor(device: Device, id = 0) {
        super('RGB', device, id);
    }

    /** Toggles the output. */
    toggle(): PromiseLike<RGBSetResponse> {
        return this.rpc<RGBSetResponse>('Toggle', { id: this.id });
    }

    /** Sets RGB output state, colour, brightness, and optional transition duration. */
    set(params: RGBSetParams): PromiseLike<RGBSetResponse> {
        return this.rpc<RGBSetResponse>('Set', { id: this.id, ...params });
    }
}
