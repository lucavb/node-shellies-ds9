import { characteristic, ComponentWithId } from './base';
import { Device } from '../devices';

/** Configuration shared by the live energy meter components. */
export interface EMConfig {
    id: number;
    name?: string | null;
}

/** Energy-data components have no configuration fields. */
export type EMDataConfig = Record<string, never>;

/** EM1Data likewise has an empty config, independently confirmed by Homey's implementation. */
export type EM1DataConfig = Record<string, never>;

/** Three-phase live measurements reported by `em:<id>`. */
export interface EMAttributes {
    id: number;
    a_voltage?: number | null;
    a_current?: number | null;
    a_act_power?: number | null;
    a_aprt_power?: number | null;
    a_pf?: number | null;
    a_freq?: number | null;
    b_voltage?: number | null;
    b_current?: number | null;
    b_act_power?: number | null;
    b_aprt_power?: number | null;
    b_pf?: number | null;
    b_freq?: number | null;
    c_voltage?: number | null;
    c_current?: number | null;
    c_act_power?: number | null;
    c_aprt_power?: number | null;
    c_pf?: number | null;
    c_freq?: number | null;
    n_current?: number | null;
    total_current?: number | null;
    total_act_power?: number | null;
    total_aprt_power?: number | null;
    total_pf?: number | null;
    errors?: string[];
}

/** Single-phase live measurements reported by `em1:<id>`. */
export interface EM1Attributes {
    id: number;
    voltage?: number | null;
    current?: number | null;
    act_power?: number | null;
    aprt_power?: number | null;
    pf?: number | null;
    freq?: number | null;
    errors?: string[];
}

/** Accumulated energy counters reported by `emdata:<id>`, in Wh. */
export interface EMDataAttributes {
    id: number;
    a_total_act_energy?: number | null;
    a_total_act_ret_energy?: number | null;
    b_total_act_energy?: number | null;
    b_total_act_ret_energy?: number | null;
    c_total_act_energy?: number | null;
    c_total_act_ret_energy?: number | null;
    total_act?: number | null;
    total_act_ret?: number | null;
    errors?: string[];
}

/** Accumulated energy counters reported by `em1data:<id>`, in Wh. */
export interface EM1DataAttributes {
    id: number;
    total_act_energy?: number | null;
    total_act_ret_energy?: number | null;
    errors?: string[];
}

/**
 * Three-phase energy-meter measurements. Electrical values can be null when
 * the firmware cannot provide a reading; omitted values are not overwritten
 * by partial status notifications.
 */
export class EM extends ComponentWithId<EMAttributes, EMConfig> implements EMAttributes {
    @characteristic
    readonly a_voltage: number | null | undefined;
    @characteristic
    readonly a_current: number | null | undefined;
    @characteristic
    readonly a_act_power: number | null | undefined;
    @characteristic
    readonly a_aprt_power: number | null | undefined;
    @characteristic
    readonly a_pf: number | null | undefined;
    @characteristic
    readonly a_freq: number | null | undefined;
    @characteristic
    readonly b_voltage: number | null | undefined;
    @characteristic
    readonly b_current: number | null | undefined;
    @characteristic
    readonly b_act_power: number | null | undefined;
    @characteristic
    readonly b_aprt_power: number | null | undefined;
    @characteristic
    readonly b_pf: number | null | undefined;
    @characteristic
    readonly b_freq: number | null | undefined;
    @characteristic
    readonly c_voltage: number | null | undefined;
    @characteristic
    readonly c_current: number | null | undefined;
    @characteristic
    readonly c_act_power: number | null | undefined;
    @characteristic
    readonly c_aprt_power: number | null | undefined;
    @characteristic
    readonly c_pf: number | null | undefined;
    @characteristic
    readonly c_freq: number | null | undefined;
    @characteristic
    readonly n_current: number | null | undefined;
    @characteristic
    readonly total_current: number | null | undefined;
    @characteristic
    readonly total_act_power: number | null | undefined;
    @characteristic
    readonly total_aprt_power: number | null | undefined;
    @characteristic
    readonly total_pf: number | null | undefined;
    @characteristic
    readonly errors: string[] | undefined;

    constructor(device: Device, id = 0) {
        super('EM', device, id, 'em');
    }
}

/** Single-phase energy-meter measurements. */
export class EM1 extends ComponentWithId<EM1Attributes, EMConfig> implements EM1Attributes {
    @characteristic
    readonly voltage: number | null | undefined;
    @characteristic
    readonly current: number | null | undefined;
    @characteristic
    readonly act_power: number | null | undefined;
    @characteristic
    readonly aprt_power: number | null | undefined;
    @characteristic
    readonly pf: number | null | undefined;
    @characteristic
    readonly freq: number | null | undefined;
    @characteristic
    readonly errors: string[] | undefined;

    constructor(device: Device, id = 0) {
        super('EM1', device, id, 'em1');
    }
}

/**
 * Cumulative imported/exported active-energy counters for a three-phase meter.
 * This is meter data, not instantaneous power; units are Wh.
 */
export class EMData extends ComponentWithId<EMDataAttributes, EMDataConfig> implements EMDataAttributes {
    @characteristic
    readonly a_total_act_energy: number | null | undefined;
    @characteristic
    readonly a_total_act_ret_energy: number | null | undefined;
    @characteristic
    readonly b_total_act_energy: number | null | undefined;
    @characteristic
    readonly b_total_act_ret_energy: number | null | undefined;
    @characteristic
    readonly c_total_act_energy: number | null | undefined;
    @characteristic
    readonly c_total_act_ret_energy: number | null | undefined;
    @characteristic
    readonly total_act: number | null | undefined;
    @characteristic
    readonly total_act_ret: number | null | undefined;
    @characteristic
    readonly errors: string[] | undefined;

    constructor(device: Device, id = 0) {
        super('EMData', device, id, 'emdata');
    }
}

/** Cumulative imported/exported active-energy counters for a single-phase meter, in Wh. */
export class EM1Data extends ComponentWithId<EM1DataAttributes, EM1DataConfig> implements EM1DataAttributes {
    @characteristic
    readonly total_act_energy: number | null | undefined;
    @characteristic
    readonly total_act_ret_energy: number | null | undefined;
    @characteristic
    readonly errors: string[] | undefined;

    constructor(device: Device, id = 0) {
        super('EM1Data', device, id, 'em1data');
    }
}
