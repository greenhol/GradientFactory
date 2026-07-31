import { RGB } from '../shared/colour/colour';
import { ColourMapper, Easing } from '../shared/colour/colour-mapper';
import { DualRangeSlider } from './dual-range-slider';
import { GradientBand } from './gradient-band';
import { distributeColors } from './random-gradient';

export interface RandomizerConfig {
    seed: number;
    count: number;
    lMin: number;
    lMax: number;
    cMin: number;
    cMax: number;
}

/**
 * "Randomizer": lets the user generate a fresh random gradient (via
 * distributeColors, in OkLch space) from a seed/count field and two
 * min/max range pairs (Lightness, Chroma). Shown in its own clickable
 * GradientBand — click copies the gradient string, same as the gallery.
 *
 * Changing the global Easing re-colours the *same* generated colour
 * array (like the gallery does) — only the "Randomize" button actually
 * generates new colours.
 */
export class RandomizerSection {

    private readonly _config: RandomizerConfig;
    private readonly _band: GradientBand;

    private _currentEasing: Easing;
    private _colours: RGB[];
    private _mapper: ColourMapper;

    constructor(container: HTMLElement, config: RandomizerConfig, easing: Easing) {
        this._config = config;
        this._currentEasing = easing;

        const controls = document.createElement('div');
        controls.className = 'randomizer-controls';
        container.appendChild(controls);

        this.buildNumberField(controls, 'Count', config.count, 2, 16, (value) => {
            this._config.count = value;
        }, undefined, 'randomizer-field--fixed');

        this.buildMinMaxField(controls, 'Lightness', config.lMin, config.lMax, 0, 1, 0.01, (min, max) => {
            this._config.lMin = min;
            this._config.lMax = max;
        }, (v) => v.toFixed(2));

        this.buildMinMaxField(controls, 'Chroma', config.cMin, config.cMax, 0, 0.5, 0.005, (min, max) => {
            this._config.cMin = min;
            this._config.cMax = max;
        }, (v) => v.toFixed(3));

        const bandContainer = document.createElement('div');
        container.appendChild(bandContainer);

        const footer = document.createElement('div');
        footer.className = 'randomizer-footer';
        container.appendChild(footer);

        this.buildNumberField(footer, 'Seed', config.seed, -1, 1000, (value) => {
            this._config.seed = value;
        }, '-1 = random');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'randomizer-button';
        button.textContent = 'Randomize';
        button.addEventListener('click', () => this.randomize());
        footer.appendChild(button);

        this._colours = this.generateColours();
        this._mapper = ColourMapper.fromColours(this._colours, easing);
        this._band = new GradientBand(bandContainer, this._mapper, 60);
    }

    public setEasing(easing: Easing): void {
        this._currentEasing = easing;
        this._mapper = ColourMapper.fromColours(this._colours, easing);
        this._band.setSource(this._mapper);
    }

    private randomize(): void {
        this._colours = this.generateColours();
        this._mapper = ColourMapper.fromColours(this._colours, this._currentEasing);
        this._band.setSource(this._mapper);
    }

    private generateColours(): RGB[] {
        const seed = this._config.seed === -1 ? null : this._config.seed;
        return distributeColors(
            this._config.count,
            this._config.lMin,
            this._config.lMax,
            this._config.cMin,
            this._config.cMax,
            seed,
        );
    }

    private buildNumberField(
        container: HTMLElement,
        label: string,
        initialValue: number,
        min: number,
        max: number,
        onChange: (value: number) => void,
        title?: string,
        extraClassName?: string,
    ): void {
        const field = document.createElement('label');
        field.className = extraClassName ? `randomizer-field ${extraClassName}` : 'randomizer-field';
        container.appendChild(field);

        const labelText = document.createElement('span');
        labelText.className = 'randomizer-field-label';
        labelText.textContent = label;
        field.appendChild(labelText);

        const input = document.createElement('input');
        input.className = 'ag6775';
        input.type = 'number';
        input.min = String(min);
        input.max = String(max);
        input.step = '1';
        input.value = String(initialValue);
        if (title) input.title = title;
        input.addEventListener('change', () => onChange(Number(input.value)));
        field.appendChild(input);
    }

    private buildMinMaxField(
        container: HTMLElement,
        label: string,
        initialMin: number,
        initialMax: number,
        min: number,
        max: number,
        step: number,
        onChange: (min: number, max: number) => void,
        formatValue?: (value: number) => string,
    ): void {
        const field = document.createElement('div');
        field.className = 'randomizer-field randomizer-field--flex';
        container.appendChild(field);

        const labelText = document.createElement('span');
        labelText.className = 'randomizer-field-label';
        labelText.textContent = label;
        field.appendChild(labelText);

        const slider = new DualRangeSlider(field, {
            min,
            max,
            step,
            initialMin,
            initialMax,
            label,
            formatValue,
        });
        slider.onChange((minValue, maxValue) => onChange(minValue, maxValue));
    }
}