import { BehaviorSubject, Observable } from 'rxjs';
import { Colour, RGB } from '../shared/colour/colour';
import { ColourMapper, Easing, SupportPoint } from '../shared/colour/colour-mapper';
import { GradientBand } from './gradient-band';

interface ColourGroup {
    colour: RGB;
    indices: number[];
}

export class PlaygroundSection {

    private readonly _band: GradientBand;
    private readonly _input: HTMLInputElement;
    private readonly _swatchRow: HTMLDivElement;
    private _currentEasing: Easing;

    private _gradientString$ = new BehaviorSubject<string | null>(null);
    public gradientString$: Observable<string | null> = this._gradientString$;

    constructor(container: HTMLElement, initialGradient: string, easing: Easing) {
        this._currentEasing = easing;

        const initialMapper = ColourMapper.fromString(initialGradient, easing);
        this._band = new GradientBand(container, initialMapper, 100);

        this._input = document.createElement('input');
        this._input.type = 'text';
        this._input.className = 'playground-input';
        this._input.value = initialGradient;
        container.appendChild(this._input);

        this._input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.commit();
        });
        this._input.addEventListener('blur', () => this.commit());

        this._swatchRow = document.createElement('div');
        this._swatchRow.className = 'playground-swatch-row';
        container.appendChild(this._swatchRow);

        this.rebuildSwatches(initialMapper.supportPoints);
    }

    public setEasing(easing: Easing): void {
        this._currentEasing = easing;
        this.commit();
    }

    private commit(): void {
        const mapper = this.applyGradientString(this._input.value);
        this.rebuildSwatches(mapper.supportPoints);
    }

    private applyGradientString(gradientString: string): ColourMapper {
        this._input.value = gradientString;
        this._gradientString$.next(gradientString);
        const mapper = ColourMapper.fromString(gradientString, this._currentEasing);
        this._band.setSource(mapper);
        return mapper;
    }

    private rebuildSwatches(points: SupportPoint[]): void {
        this._swatchRow.innerHTML = '';

        for (const group of this.groupByColour(points)) {
            const swatch = document.createElement('input');
            swatch.type = 'color';
            swatch.className = 'playground-swatch';
            swatch.value = Colour.rgbToHex(group.colour);

            // Live: update text/band/subject only — never rebuild the
            // swatch DOM here, or we'd tear out the picker mid-drag.
            swatch.addEventListener('input', () => {
                this.applySwatchColour(points, group.indices, swatch.value);
            });

            // Finalised (picker closed): safe to fully re-sync now.
            swatch.addEventListener('change', () => this.commit());

            this._swatchRow.appendChild(swatch);
        }
    }

    private groupByColour(points: SupportPoint[]): ColourGroup[] {
        const groups: ColourGroup[] = [];

        points.forEach((point, index) => {
            const existing = groups.find((g) => this.sameColour(g.colour, point.colour));
            if (existing) {
                existing.indices.push(index);
            } else {
                groups.push({ colour: point.colour, indices: [index] });
            }
        });

        return groups;
    }

    private sameColour(a: RGB, b: RGB): boolean {
        return a.r === b.r && a.g === b.g && a.b === b.b;
    }

    private applySwatchColour(points: SupportPoint[], indices: number[], hex: string): void {
        const newColour = this.hexToRgb(hex);
        const updated: SupportPoint[] = points.map((point, index) =>
            indices.includes(index) ? { pos: point.pos, colour: newColour } : point
        );
        this.applyGradientString(ColourMapper.stringifySupportPoints(updated));
    }

    private hexToRgb(hex: string): RGB {
        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16),
        };
    }
}