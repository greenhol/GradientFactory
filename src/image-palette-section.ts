import { RGB } from '../shared/colour/colour';
import { ColourMapper, Easing } from '../shared/colour/colour-mapper';
import { GradientBand } from './gradient-band';
import { ColourCluster, ColourOrder, extractor } from './image-colour-extractor';

const BAND_HEIGHT = 60;
const DEFAULT_POINTS = 5;
const MIN_POINTS = 2;
const MAX_POINTS = 16;
const DEFAULT_ORDER = ColourOrder.LIGHTNESS;
const MAX_SAMPLE_DIMENSION = 150; // downsample to at most this many px on the longer side before analysis

// ColourMapper requires at least two support points, so the band shows a
// flat white strip until an image is uploaded and a real palette replaces it.
const PLACEHOLDER_COLOURS: RGB[] = [
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 },
];

/**
 * "Image": lets the user upload an image and generates a gradient from its
 * n most predominant colours (k-means clustering in OkLab space, via the
 * `extractor` singleton). Analysis runs automatically the moment a file is
 * selected. Clustering and ordering are tracked separately — changing
 * Order only re-sorts the already-found clusters; changing Points or the
 * image itself re-clusters. Shown in its own GradientBand (click-to-copy
 * is built in there already).
 */
export class ImagePaletteSection {

    // unique id per instance, so the hidden <input>/<label for> pairing
    // never collides if more than one section is ever mounted at once
    private static _instanceCounter = 0;

    private readonly _band: GradientBand;

    private _currentEasing: Easing;
    private _points: number = DEFAULT_POINTS;
    private _order: ColourOrder = DEFAULT_ORDER;
    private _pixels: RGB[] | null = null;
    private _clusters: ColourCluster[] = [];
    private _colours: RGB[] = PLACEHOLDER_COLOURS;
    private _mapper: ColourMapper;

    constructor(container: HTMLElement, easing: Easing) {
        this._currentEasing = easing;

        const controls = document.createElement('div');
        controls.className = 'randomizer-controls'; // reuse the same row layout as the Randomizer's top row
        container.appendChild(controls);

        this.buildPointsField(controls);
        this.buildOrderField(controls);
        this.buildFileField(controls);

        const bandContainer = document.createElement('div');
        container.appendChild(bandContainer);

        this._mapper = ColourMapper.fromColours(this._colours, easing);
        this._band = new GradientBand(bandContainer, this._mapper, BAND_HEIGHT);
    }

    public setEasing(easing: Easing): void {
        this._currentEasing = easing;
        this._mapper = ColourMapper.fromColours(this._colours, easing);
        this._band.setSource(this._mapper);
    }

    private buildPointsField(container: HTMLElement): void {
        const field = document.createElement('label');
        field.className = 'randomizer-field randomizer-field--fixed';
        container.appendChild(field);

        const labelText = document.createElement('span');
        labelText.className = 'randomizer-field-label';
        labelText.textContent = 'Points';
        field.appendChild(labelText);

        const input = document.createElement('input');
        input.type = 'number';
        input.min = String(MIN_POINTS);
        input.max = String(MAX_POINTS);
        input.step = '1';
        input.value = String(this._points);
        input.addEventListener('change', () => {
            this._points = Number(input.value);
            this.reclusterAndApply();
        });
        field.appendChild(input);
    }

    private buildOrderField(container: HTMLElement): void {
        const field = document.createElement('label');
        field.className = 'randomizer-field randomizer-field--fixed';
        container.appendChild(field);

        const labelText = document.createElement('span');
        labelText.className = 'randomizer-field-label';
        labelText.textContent = 'Order';
        field.appendChild(labelText);

        const select = document.createElement('select');
        select.className = 'easing-select'; // reuse existing dropdown styling

        for (const value of Object.values(ColourOrder)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }

        select.value = this._order;
        select.addEventListener('change', () => {
            this._order = select.value as ColourOrder;
            this.applyOrder(); // re-sort only — never re-clusters
        });
        field.appendChild(select);
    }

    private buildFileField(container: HTMLElement): void {
        const field = document.createElement('div');
        field.className = 'randomizer-field randomizer-field--flex';
        container.appendChild(field);

        const labelText = document.createElement('span');
        labelText.className = 'randomizer-field-label';
        labelText.textContent = 'Image';
        field.appendChild(labelText);

        const row = document.createElement('div');
        row.className = 'file-upload-row';
        field.appendChild(row);

        const inputId = `image-upload-${ImagePaletteSection._instanceCounter++}`;

        // The real input: visually hidden (not display:none — that would
        // remove it from the tab order and break keyboard accessibility)
        // but still focusable and still the thing that actually opens the
        // native file picker.
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.id = inputId;
        input.className = 'file-upload-input';
        row.appendChild(input);

        // A <label for="..."> pointing at a file input natively opens its
        // picker on click, or on Enter/Space when the input is keyboard-
        // focused — no JS needed for the triggering itself.
        const trigger = document.createElement('label');
        trigger.setAttribute('for', inputId);
        trigger.className = 'div-button';
        trigger.textContent = 'Choose Image';
        row.appendChild(trigger);

        const fileName = document.createElement('span');
        fileName.className = 'file-upload-name';
        fileName.textContent = 'No file chosen';
        row.appendChild(fileName);

        input.addEventListener('change', () => {
            const file = input.files?.[0];
            fileName.textContent = file ? file.name : 'No file chosen';
            if (file) {
                this.loadImage(file);
            }
        });
    }

    private loadImage(file: File): void {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            this._pixels = this.samplePixels(image);
            URL.revokeObjectURL(objectUrl);
            this.reclusterAndApply();
        };
        image.onerror = () => {
            console.error('ImagePaletteSection: failed to load the selected image');
            URL.revokeObjectURL(objectUrl);
        };

        image.src = objectUrl;
    }

    /** Downsamples the image onto an offscreen canvas and reads its pixels. */
    private samplePixels(image: HTMLImageElement): RGB[] {
        const scale = Math.min(1, MAX_SAMPLE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0, width, height);

        const { data } = ctx.getImageData(0, 0, width, height);
        const pixels: RGB[] = [];
        for (let i = 0; i < data.length; i += 4) {
            pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
        }
        return pixels;
    }

    /** Re-runs k-means against the cached pixels (image or point count changed). */
    private reclusterAndApply(): void {
        if (!this._pixels || this._pixels.length === 0) {
            return;
        }
        this._clusters = extractor.clusterColours(this._pixels, this._points);
        this.applyOrder();
    }

    /** Re-sorts the already-clustered palette and redraws — no clustering here. */
    private applyOrder(): void {
        if (this._clusters.length === 0) {
            return;
        }
        this._colours = extractor.orderColours(this._clusters, this._order);
        this._mapper = ColourMapper.fromColours(this._colours, this._currentEasing);
        this._band.setSource(this._mapper);
    }
}
