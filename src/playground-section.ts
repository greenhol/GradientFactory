import { BehaviorSubject, Observable } from 'rxjs';
import { ColourMapper, Easing } from '../shared/colour/colour-mapper';
import { GradientBand } from './gradient-band';

export class PlaygroundSection {

    private readonly _band: GradientBand;
    private readonly _input: HTMLInputElement;
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
    }

    public setEasing(easing: Easing): void {
        this._currentEasing = easing;
        this.commit(); // re-parse the current string under the new easing
    }

    private commit(): void {
        const currentGradientString = this._input.value;
        this._gradientString$.next(currentGradientString);
        const mapper = ColourMapper.fromString(currentGradientString, this._currentEasing);
        this._band.setSource(mapper);
    }
}