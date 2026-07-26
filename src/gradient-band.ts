import { ColourMapper } from '../shared/colour/colour-mapper';

export class GradientBand {

    private readonly _frame: HTMLDivElement;
    private readonly _canvas: HTMLCanvasElement;
    private readonly _ctx: CanvasRenderingContext2D;
    private readonly _resizeObserver: ResizeObserver;
    private readonly _flashColour = '#1a1a18';

    private _mapper: ColourMapper;
    private _flashTimeoutId: number | undefined;

    constructor(container: HTMLElement, mapper: ColourMapper, height: number) {
        this._mapper = mapper;

        this._frame = document.createElement('div');
        this._frame.className = 'gradient-band gradient-band--clickable';
        container.appendChild(this._frame);

        this._canvas = document.createElement('canvas');
        this._canvas.className = 'gradient-band-canvas';
        this._canvas.style.height = `${height}px`;
        this._frame.appendChild(this._canvas);

        this._ctx = this._canvas.getContext('2d')!;

        this._frame.addEventListener('click', () => this.handleClick());

        this._resizeObserver = new ResizeObserver(() => this.redraw());
        this._resizeObserver.observe(this._canvas);

        this.redraw();
    }

    public setSource(mapper: ColourMapper): void {
        this._mapper = mapper;
        this.redraw();
    }

    public redraw(): void {
        const dpr = window.devicePixelRatio || 1;

        const rect = this._canvas.getBoundingClientRect();
        if (rect.width === 0) {
            return;
        }

        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));

        this._canvas.width = width;
        this._canvas.height = height;

        const row = new Uint8ClampedArray(width * 4);
        for (let x = 0; x < width; x++) {
            const t = x / width;
            const colour = this._mapper.mapLooped(t);
            const idx = x * 4;
            row[idx] = colour.r;
            row[idx + 1] = colour.g;
            row[idx + 2] = colour.b;
            row[idx + 3] = 255;
        }

        const imageData = this._ctx.createImageData(width, height);
        const data = imageData.data;
        for (let y = 0; y < height; y++) {
            data.set(row, y * width * 4);
        }

        this._ctx.putImageData(imageData, 0, 0);
    }

    public handleClick(): void {
        navigator.clipboard.writeText(this._mapper.asString).then(() => {
            this.flashBorder(this._flashColour);
        });
    }

    private flashBorder(colour: string, durationMs: number = 600): void {
        window.clearTimeout(this._flashTimeoutId);

        this._frame.style.outline = `3px solid ${colour}`;
        this._frame.style.outlineOffset = '-3px';

        this._flashTimeoutId = window.setTimeout(() => {
            this._frame.style.outline = '';
            this._frame.style.outlineOffset = '';
        }, durationMs);
    }
}
