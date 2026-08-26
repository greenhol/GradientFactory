import { RGB } from '../shared/colour/colour';
import { colourDistributionCosine, colourDistributionEven } from '../shared/colour/colour-distribution';
import { ColourMapper, Easing } from '../shared/colour/colour-mapper';
import { XoRng } from '../shared/xo-rng';
import { DualRangeSlider } from './dual-range-slider';
import { GradientBand } from './gradient-band';
import { buildSectionHeader } from './section-header';

export enum RandomizerType {
    EVEN = 'Evenly Distributed',
    INIGO_QUILEZ = 'Inigo Quilez\'s formula',
}

export interface RandomizerConfig {
    type: RandomizerType,
    seed: number;
    count: number;
    lMin: number;
    lMax: number;
    cMin: number;
    cMax: number;
    aMin: number;
    aMax: number;
    bMin: number;
    bMax: number;
}

export class RandomizerSection {

    private readonly _config: RandomizerConfig;
    private readonly _controls: HTMLDivElement;
    private readonly _band: GradientBand;

    private _currentEasing: Easing;
    private _colours: RGB[];
    private _mapper: ColourMapper;

    constructor(container: HTMLElement, config: RandomizerConfig, easing: Easing) {
        this._config = config;
        this._currentEasing = easing;

        container.appendChild(buildSectionHeader('Randomizer', this.buildTypeDropdown()));

        this._controls = document.createElement('div');
        this._controls.className = 'randomizer-controls';
        container.appendChild(this._controls);
        this.rebuildControls();

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
        button.className = 'div-button';
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
        const rng = new XoRng(seed);

        if (this._config.type === RandomizerType.INIGO_QUILEZ) {
            return colourDistributionCosine(
                this._config.count,
                this._config.aMin,
                this._config.aMax,
                this._config.bMin,
                this._config.bMax,
                rng,
            );
        }

        return colourDistributionEven(
            this._config.count,
            this._config.lMin,
            this._config.lMax,
            this._config.cMin,
            this._config.cMax,
            rng,
        );
    }

    private buildTypeDropdown(): HTMLSelectElement {
        const select = document.createElement('select');
        select.id = 'randomizer-type-selector';

        for (const value of Object.values(RandomizerType)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }

        select.value = this._config.type;
        select.style.marginBottom = '-9px';
        select.addEventListener('change', () => {
            this._config.type = select.value as RandomizerType;
            this.rebuildControls();
            this.randomize(); // old palette no longer corresponds to the now-visible fields
        });

        return select;
    }

    /** Tears down and rebuilds the input row for whichever type is currently selected. */
    private rebuildControls(): void {
        this._controls.innerHTML = '';

        this.buildNumberField(this._controls, 'Count', this._config.count, 2, 16, (value) => {
            this._config.count = value;
        }, undefined, 'randomizer-field--fixed');

        if (this._config.type === RandomizerType.INIGO_QUILEZ) {
            this.buildMinMaxField(this._controls, 'A (offset)', this._config.aMin, this._config.aMax, 0, 1, 0.01, (min, max) => {
                this._config.aMin = min;
                this._config.aMax = max;
            }, (v) => v.toFixed(2));

            this.buildMinMaxField(this._controls, 'B (amplitude)', this._config.bMin, this._config.bMax, 0, 1, 0.01, (min, max) => {
                this._config.bMin = min;
                this._config.bMax = max;
            }, (v) => v.toFixed(2));
        } else {
            this.buildMinMaxField(this._controls, 'Lightness', this._config.lMin, this._config.lMax, 0, 1, 0.01, (min, max) => {
                this._config.lMin = min;
                this._config.lMax = max;
            }, (v) => v.toFixed(2));

            this.buildMinMaxField(this._controls, 'Chroma', this._config.cMin, this._config.cMax, 0, 0.5, 0.005, (min, max) => {
                this._config.cMin = min;
                this._config.cMax = max;
            }, (v) => v.toFixed(3));
        }
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