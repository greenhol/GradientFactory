import { ColourMapper, Easing } from '../shared/colour/colour-mapper';
import { GradientBand } from './gradient-band';
import { buildSectionHeader } from './section-header';

interface GradientSample {
    name: string;
    colours: string;
}

interface GradientSampleCategory {
    name: string;
    gradients: GradientSample[];
}

interface GallerySampleEntry {
    colours: string;
    band: GradientBand;
}

export class GallerySection {
    private readonly _categories: GradientSampleCategory[] = [
        {
            name: 'Common',
            gradients: [
                { name: 'Red Green Blue', colours: '0:#ff0000, 0.3333333333333333:#00ff00, 0.6666666666666666:#0000ff, 1:#ff0000' },
                { name: 'Fire', colours: '0:#000000, 0.2:#8b0000, 0.4:#ffa500, 0.6:#ffff00, 0.8:#ffffff, 1:#000000' },
                { name: 'Sunset', colours: '0:#00008b, 0.2:#ffa500, 0.4:#fa8072, 0.6:#ffd700, 0.8:#ffff00, 1:#00008b' },
                { name: 'Rainbow', colours: '0:#800080, 0.16666666666666666:#0000ff, 0.3333333333333333:#00ffff, 0.5:#00ff00, 0.6666666666666666:#ffff00, 0.8333333333333334:#ff0000, 1:#800080' },
                { name: 'Ocean', colours: '0:#000080, 0.2:#008080, 0.4:#6495ed, 0.6:#20b2aa, 0.8:#00ffff, 1:#000080' },
                { name: 'Purple Haze', colours: '0:#4b0082, 0.2:#800080, 0.4:#ff1493, 0.6:#e6e6fa, 0.8:#ffffff, 1:#4b0082' },
                { name: 'Electric', colours: '0:#4b0082, 0.25:#1e90ff, 0.5:#00ffff, 0.75:#32cd32, 1:#4b0082' },
                { name: 'Pastel', colours: '0:#e6e6fa, 0.25:#bdfcc9, 0.5:#87ceeb, 0.75:#d8bfd8, 1:#e6e6fa' },
            ],
        },
        {
            name: 'Custom',
            gradients: [
                { name: 'Cappuccino', colours: '0:#faf5ed, 0.2:#d2aa78, 0.4:#824a25, 0.6:#412313, 0.95:#f2ebdc, 1:#faf5ed' },
                { name: 'Rust', colours: '0:#f5deb3, 0.25:#d2691e, 0.5:#8b0000, 0.75:#36454f, 1:#f5deb3' },
            ],
        },
        {
            name: 'C64',
            gradients: [
                { name: 'C64 Rainbow', colours: '0:#2e2c9b, 0.2:#8e3c97, 0.4:#813338, 0.6:#edf171, 0.8:#56ac4d, 1:#2e2c9b' },
                { name: 'C64 Mandelbrot', colours: '0:#000000, 0.1111111111111111:#2e2c9b, 0.2222222222222222:#706deb, 0.3333333333333333:#8e3c97, 0.4444444444444444:#813338, 0.5555555555555556:#c46c71, 0.6666666666666666:#8e5029, 0.7777777777777778:#ffff00, 0.8888888888888888:#ffffff, 1:#000000' },
                { name: 'C64 All Colours', colours: '0:#000000, 0.0625:#813338, 0.125:#75cec8, 0.1875:#8e3c97, 0.25:#56ac4d, 0.3125:#2e2c9b, 0.375:#edf171, 0.4375:#8e5029, 0.5:#553800, 0.5625:#c46c71, 0.625:#4a4a4a, 0.6875:#7b7b7b, 0.75:#a9ff9f, 0.8125:#706deb, 0.875:#b2b2b2, 0.9375:#ffffff, 1:#000000' },
            ],
        },
        {
            name: 'Quake Single',
            gradients: [
                { name: "Original Earth-tone", colours: "0:#1a1410, 0.2:#4a3524, 0.4:#6b4a2e, 0.6:#8c3a28, 0.8:#4a2818, 1:#1a1410" },
                { name: "Sulfur / Toxic Yellow-Green", colours: "0:#1a1608, 0.2:#3d3418, 0.4:#6b5c1c, 0.6:#7a6e1a, 0.8:#4a4212, 1:#1a1608" },
                { name: "Sickly Green", colours: "0:#12160f, 0.2:#2a3320, 0.4:#3f4a28, 0.6:#566b2a, 0.8:#324018, 1:#12160f" },
                { name: "Cold Blue-Grey Stone", colours: "0:#12161a, 0.2:#25313a, 0.4:#3a4d52, 0.6:#4f6560, 0.8:#2e4238, 1:#12161a" },
                { name: "Molten Lava / Fire", colours: "0:#1a0f08, 0.2:#4a2010, 0.4:#8c3410, 0.6:#c9531a, 0.8:#6b2a12, 1:#1a0f08" },
                { name: "Purple / Violet Arcane", colours: "0:#160f1a, 0.2:#3a2040, 0.4:#5c2e5c, 0.6:#7a3a6b, 0.8:#442850, 1:#160f1a" },
                { name: "Bone / Desert Sand", colours: "0:#1a150f, 0.2:#4a3c25, 0.4:#7a6238, 0.6:#a8894a, 0.8:#5c4a2c, 1:#1a150f" },
            ],
        },
        {
            name: 'Quake Dual',
            gradients: [
                { name: "Rust ⟶ Toxic Green", colours: "0:#1a1410, 0.2:#5c3018, 0.4:#8c3a28, 0.6:#4a5c1a, 0.8:#2a3320, 1:#1a1410" },
                { name: "Blood Red ⟶ Cold Stone Blue", colours: "0:#160f10, 0.2:#5c1e1e, 0.4:#8c3428, 0.6:#2e4a52, 0.8:#1e2e38, 1:#160f10" },
                { name: "Sulfur Yellow ⟶ Arcane Purple", colours: "0:#160f1a, 0.2:#5c4a18, 0.4:#7a6e1a, 0.6:#5c2e5c, 0.8:#3a2040, 1:#160f1a" },
                { name: "Lava Orange ⟶ Bone Sand", colours: "0:#1a1008, 0.2:#8c3410, 0.4:#c9531a, 0.6:#a8894a, 0.8:#6b5230, 1:#1a1008" },
                { name: "Rust ⟶ Cold Blue-Grey", colours: "0:#14120e, 0.2:#4a3524, 0.4:#8c3a28, 0.6:#3a4d52, 0.8:#25313a, 1:#14120e" },
                { name: "Sickly Green ⟶ Blood Red", colours: "0:#0f120c, 0.2:#3f4a28, 0.4:#566b2a, 0.6:#7a2820, 0.8:#4a1414, 1:#0f120c" },
            ],
        },
    ];

    private readonly _grid: HTMLDivElement;
    private _entries: GallerySampleEntry[] = [];
    private _currentEasing: Easing;
    private _currentCategory: GradientSampleCategory;

    constructor(container: HTMLElement, easing: Easing) {
        this._currentEasing = easing;
        this._currentCategory = this._categories[0];

        container.appendChild(buildSectionHeader('Gallery', this.buildCategoryDropdown()));

        this._grid = document.createElement('div');
        this._grid.className = 'gallery-grid';
        container.appendChild(this._grid);

        this.rebuildBands();
    }

    public setEasing(easing: Easing): void {
        this._currentEasing = easing;
        for (const entry of this._entries) {
            const mapper = ColourMapper.fromString(entry.colours, easing);
            entry.band.setSource(mapper);
        }
    }

    private buildCategoryDropdown(): HTMLSelectElement {
        const select = document.createElement('select');
        select.id = 'category-selector';

        for (const category of this._categories) {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        }

        select.value = this._currentCategory.name;
        select.style.marginBottom = '-9px';
        select.addEventListener('change', () => {
            const category = this._categories.find((c) => c.name === select.value);
            if (category) {
                this._currentCategory = category;
                this.rebuildBands();
            }
        });

        return select;
    }

    /** Tears down and recreates every band for the currently selected category. */
    private rebuildBands(): void {
        this._grid.innerHTML = '';
        this._entries = [];

        for (const sample of this._currentCategory.gradients) {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            this._grid.appendChild(item);

            const nameLabel = document.createElement('div');
            nameLabel.className = 'gallery-name';
            nameLabel.textContent = sample.name;
            item.appendChild(nameLabel);

            const mapper = ColourMapper.fromString(sample.colours, this._currentEasing);
            const band = new GradientBand(item, mapper, 40);

            this._entries.push({ colours: sample.colours, band });
        }
    }
}