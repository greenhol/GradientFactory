import { RGB } from '../shared/colour/colour';
import { ColourMapper, Easing } from '../shared/colour/colour-mapper';
import { GradientBand } from './gradient-band';
import { ColourCluster, ColourOrder, extractor } from './image-colour-extractor';
import { buildSectionHeader } from './section-header';

export interface ExtractorConfig {
    points: number;
    vividness: number;
    order: ColourOrder;
}

const BAND_HEIGHT = 60;
const MIN_POINTS = 2;
const MAX_POINTS = 16;
const MAX_SAMPLE_DIMENSION = 150;

const PLACEHOLDER_COLOURS: RGB[] = [
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 },
];

/**
 * "Image": lets the user upload an image and generates a gradient from its
 * n most predominant colours (k-means clustering in OkLab space, via the
 * `extractor` singleton). Analysis runs automatically the moment a file is
 * selected. Clustering and ordering are tracked separately — changing
 * Order only re-sorts the already-found clusters; changing Points, Image,
 * or Vividness re-clusters. Shown in its own GradientBand
 */
export class ImagePaletteSection {

    private static _instanceCounter = 0;

    private readonly _band: GradientBand;

    private _config: ExtractorConfig;
    private _currentEasing: Easing;
    private _pixels: RGB[] | null = null;
    private _clusters: ColourCluster[] = [];
    private _colours: RGB[] = PLACEHOLDER_COLOURS;
    private _mapper: ColourMapper;

    constructor(container: HTMLElement, config: ExtractorConfig, easing: Easing) {
        this._currentEasing = easing;
        this._config = config;

        container.appendChild(buildSectionHeader('Image Extractor'));

        const controls = document.createElement('div');
        controls.className = 'randomizer-controls'; // reuse the same row layout as the Randomizer's top row
        container.appendChild(controls);

        this.buildPointsField(controls, this._config.points, (value) => {
            this._config.points = value;
        });

        this.buildVividnessField(controls, this._config.vividness, (value) => {
            this._config.vividness = value;
        });

        this.buildOrderField(controls, this._config.order, (value) => {
            this._config.order = value;
        });

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

    private buildPointsField(
        container: HTMLElement,
        initialValue: number,
        onChange: (value: number) => void,
    ): void {
        const field = document.createElement('label');
        field.className = 'randomizer-field randomizer-field--fixed';
        container.appendChild(field);

        const labelText = document.createElement('span');
        labelText.className = 'randomizer-field-label';
        labelText.textContent = 'Points';
        field.appendChild(labelText);

        const input = document.createElement('input');
        input.className = 'ag6775';
        input.type = 'number';
        input.min = String(MIN_POINTS);
        input.max = String(MAX_POINTS);
        input.step = '1';
        input.value = String(initialValue);
        input.addEventListener('change', () => {
            onChange(Number(input.value));
            this.reclusterAndApply();
        });
        field.appendChild(input);
    }

    private buildVividnessField(
        container: HTMLElement,
        initialValue: number,
        onChange: (value: number) => void,
    ): void {
        const field = document.createElement('label');
        field.className = 'randomizer-field randomizer-field--fixed';
        field.title = 'How strongly to favour saturated, eye-catching colours over faithfully-averaged ones';
        container.appendChild(field);

        const labelText = document.createElement('span');
        labelText.className = 'randomizer-field-label';
        labelText.textContent = 'Vividness %';
        field.appendChild(labelText);

        const input = document.createElement('input');
        input.className = 'ag6775';
        input.type = 'number';
        input.min = '0';
        input.max = '100';
        input.step = '5';
        input.value = String(initialValue);
        input.addEventListener('change', () => {
            onChange(Number(input.value));
            this.reclusterAndApply();
        });
        field.appendChild(input);
    }

    private buildOrderField(
        container: HTMLElement,
        initialValue: ColourOrder,
        onChange: (value: ColourOrder) => void,
    ): void {
        const field = document.createElement('label');
        field.className = 'randomizer-field randomizer-field--fixed';
        container.appendChild(field);

        const labelText = document.createElement('span');
        labelText.className = 'randomizer-field-label';
        labelText.textContent = 'Order';
        field.appendChild(labelText);

        const select = document.createElement('select');
        select.id = 'order-selector';

        for (const value of Object.values(ColourOrder)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }

        select.value = initialValue;
        select.addEventListener('change', () => {
            onChange(select.value as ColourOrder);
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

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.id = inputId;
        input.className = 'file-upload-input';
        row.appendChild(input);

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

    /** Re-runs k-means against the cached pixels (image, point count, or vividness changed). */
    private reclusterAndApply(): void {
        if (!this._pixels || this._pixels.length === 0) {
            return;
        }
        this._clusters = extractor.clusterColours(this._pixels, this._config.points, this._config.vividness / 100);
        this.applyOrder();
    }

    /** Re-sorts the already-clustered palette and redraws — no clustering here. */
    private applyOrder(): void {
        if (this._clusters.length === 0) {
            return;
        }
        this._colours = extractor.orderColours(this._clusters, this._config.order);
        this._mapper = ColourMapper.fromColours(this._colours, this._currentEasing);
        this._band.setSource(this._mapper);
    }
}
