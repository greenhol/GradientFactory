export interface DualRangeSliderOptions {
    min: number;
    max: number;
    step: number;
    initialMin: number;
    initialMax: number;
    label: string;
    formatValue?: (value: number) => string;
}

/**
 * A manually-built dual-handle range slider (no native equivalent exists).
 * Uses the Pointer Events API so mouse, touch, and pen all go through one
 * code path. Square handles (no rounded corners, matching the page's
 * drafting-style aesthetic) with a floating value label above each one
 * that moves with it. Handles cannot cross — dragging min past the
 * current max (or vice versa) clamps rather than swapping.
 */
export class DualRangeSlider {

    private readonly _root: HTMLDivElement;
    private readonly _range: HTMLDivElement;
    private readonly _minHandle: HTMLDivElement;
    private readonly _maxHandle: HTMLDivElement;
    private readonly _minValueLabel: HTMLSpanElement;
    private readonly _maxValueLabel: HTMLSpanElement;

    private readonly _domainMin: number;
    private readonly _domainMax: number;
    private readonly _step: number;
    private readonly _formatValue: (value: number) => string;

    private _minValue: number;
    private _maxValue: number;
    private _onChange: (min: number, max: number) => void = () => { };

    constructor(container: HTMLElement, options: DualRangeSliderOptions) {
        this._domainMin = options.min;
        this._domainMax = options.max;
        this._step = options.step;
        this._formatValue = options.formatValue ?? ((v) => v.toFixed(2));
        this._minValue = options.initialMin;
        this._maxValue = options.initialMax;

        this._root = document.createElement('div');
        this._root.className = 'dual-slider';
        container.appendChild(this._root);

        const track = document.createElement('div');
        track.className = 'dual-slider-track';
        this._root.appendChild(track);

        this._range = document.createElement('div');
        this._range.className = 'dual-slider-range';
        this._root.appendChild(this._range);

        this._minHandle = this.buildHandle(`${options.label} minimum`);
        this._minValueLabel = this._minHandle.querySelector('.dual-slider-value')!;

        this._maxHandle = this.buildHandle(`${options.label} maximum`);
        this._maxValueLabel = this._maxHandle.querySelector('.dual-slider-value')!;

        this.attachDragHandlers(this._minHandle, true);
        this.attachDragHandlers(this._maxHandle, false);
        this.attachKeyboardHandlers(this._minHandle, true);
        this.attachKeyboardHandlers(this._maxHandle, false);

        this.render();
    }

    public onChange(callback: (min: number, max: number) => void): void {
        this._onChange = callback;
    }

    private buildHandle(ariaLabel: string): HTMLDivElement {
        const handle = document.createElement('div');
        handle.className = 'dual-slider-handle';
        handle.tabIndex = 0;
        handle.setAttribute('role', 'slider');
        handle.setAttribute('aria-label', ariaLabel);
        this._root.appendChild(handle);

        const valueLabel = document.createElement('span');
        valueLabel.className = 'dual-slider-value ag6775';
        handle.appendChild(valueLabel);

        return handle;
    }

    private attachDragHandlers(handle: HTMLDivElement, isMin: boolean): void {
        handle.addEventListener('pointerdown', (event) => {
            handle.setPointerCapture(event.pointerId);

            const onMove = (moveEvent: PointerEvent) => this.handlePointerMove(moveEvent, isMin);
            const onUp = () => {
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
            };

            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
        });
    }

    private handlePointerMove(event: PointerEvent, isMin: boolean): void {
        const rect = this._root.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        let value = this.snapToStep(this._domainMin + ratio * (this._domainMax - this._domainMin));

        if (isMin) {
            this._minValue = Math.min(value, this._maxValue);
        } else {
            this._maxValue = Math.max(value, this._minValue);
        }

        this.render();
        this._onChange(this._minValue, this._maxValue);
    }

    private attachKeyboardHandlers(handle: HTMLDivElement, isMin: boolean): void {
        handle.addEventListener('keydown', (event) => {
            let delta = 0;
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = this._step;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -this._step;
            else if (event.key === 'Home') delta = -Infinity;
            else if (event.key === 'End') delta = Infinity;
            else return;

            event.preventDefault();

            if (isMin) {
                const target = delta === -Infinity ? this._domainMin : delta === Infinity ? this._maxValue : this._minValue + delta;
                this._minValue = this.snapToStep(Math.min(Math.max(target, this._domainMin), this._maxValue));
            } else {
                const target = delta === Infinity ? this._domainMax : delta === -Infinity ? this._minValue : this._maxValue + delta;
                this._maxValue = this.snapToStep(Math.max(Math.min(target, this._domainMax), this._minValue));
            }

            this.render();
            this._onChange(this._minValue, this._maxValue);
        });
    }

    private snapToStep(value: number): number {
        const steps = Math.round((value - this._domainMin) / this._step);
        const snapped = this._domainMin + steps * this._step;
        return Math.min(this._domainMax, Math.max(this._domainMin, snapped));
    }

    private render(): void {
        const minPercent = this.percentFor(this._minValue);
        const maxPercent = this.percentFor(this._maxValue);

        this._minHandle.style.left = `${minPercent}%`;
        this._maxHandle.style.left = `${maxPercent}%`;
        this._range.style.left = `${minPercent}%`;
        this._range.style.width = `${maxPercent - minPercent}%`;

        this._minHandle.setAttribute('aria-valuemin', String(this._domainMin));
        this._minHandle.setAttribute('aria-valuemax', String(this._maxValue));
        this._minHandle.setAttribute('aria-valuenow', String(this._minValue));

        this._maxHandle.setAttribute('aria-valuemin', String(this._minValue));
        this._maxHandle.setAttribute('aria-valuemax', String(this._domainMax));
        this._maxHandle.setAttribute('aria-valuenow', String(this._maxValue));

        this._minValueLabel.textContent = this._formatValue(this._minValue);
        this._maxValueLabel.textContent = this._formatValue(this._maxValue);
    }

    private percentFor(value: number): number {
        return ((value - this._domainMin) / (this._domainMax - this._domainMin)) * 100;
    }
}
