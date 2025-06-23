import { Component } from './base';
import { Device } from '../devices';

export interface UiAttributes {}

export interface UiConfig {
    idle_brightness: number;
}

/**
 * Handles the settings of a Pro4PM device's screen.
 */
export class Ui extends Component<UiAttributes, UiConfig> implements UiAttributes {
    constructor(device: Device) {
        super('UI', device);
    }
}
