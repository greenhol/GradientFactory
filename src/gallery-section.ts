import { Colour, RGB } from '../shared/colour/colour';
import { ColourMapper, Easing } from '../shared/colour/colour-mapper';
import { GradientBand } from './gradient-band';

interface GradientSample {
    name: string;
    colours: RGB[];
}

interface GallerySampleEntry {
    colours: RGB[];
    band: GradientBand;
}

export class GallerySection {

    private readonly _entries: GallerySampleEntry[] = [];
    private readonly _gradientSamples: GradientSample[] = [
        { name: 'Red Green Blue', colours: [Colour.RED, Colour.GREEN, Colour.BLUE] },
        { name: 'Fire', colours: [Colour.BLACK, Colour.DARKRED, Colour.ORANGE, Colour.YELLOW, Colour.WHITE] },
        { name: 'Sunset', colours: [Colour.DARKBLUE, Colour.ORANGE, Colour.SALMON, Colour.GOLD, Colour.YELLOW] },
        { name: 'Rainbow', colours: [Colour.PURPLE, Colour.BLUE, Colour.CYAN, Colour.GREEN, Colour.YELLOW, Colour.RED] },
        { name: 'Ocean', colours: [Colour.NAVY, Colour.TEAL, Colour.CORNFLOWERBLUE, Colour.LIGHTSEAGREEN, Colour.AQUA] },
        { name: 'Purple Haze', colours: [Colour.INDIGO, Colour.PURPLE, Colour.DEEPPINK, Colour.LAVENDER, Colour.WHITE] },
        { name: 'Electric', colours: [Colour.INDIGO, Colour.DODGERBLUE, Colour.CYAN, Colour.LIMEGREEN] },
        { name: 'Pastel', colours: [Colour.LAVENDER, Colour.MINTGREEN, Colour.SKYBLUE, Colour.THISTLE] },
        { name: 'Cappuccino', colours: [Colour.WARM_MILK, Colour.MILKY_COFFEE, Colour.COFFEE_BROWN, Colour.DARK_ESPRESSO, Colour.FOAM_WHITE] },
        { name: 'C64 Rainbow', colours: [Colour.C64_BLUE, Colour.C64_PURPLE, Colour.C64_RED, Colour.C64_YELLOW, Colour.C64_GREEN] },
        { name: 'C64 Mandelbrot', colours: [Colour.C64_BLACK, Colour.C64_BLUE, Colour.C64_LIGHT_BLUE, Colour.C64_PURPLE, Colour.C64_RED, Colour.C64_LIGHT_RED, Colour.C64_ORANGE, Colour.YELLOW, Colour.C64_WHITE] },
        { name: 'C64 All Colours', colours: [Colour.C64_BLACK, Colour.C64_RED, Colour.C64_CYAN, Colour.C64_PURPLE, Colour.C64_GREEN, Colour.C64_BLUE, Colour.C64_YELLOW, Colour.C64_ORANGE, Colour.C64_BROWN, Colour.C64_LIGHT_RED, Colour.C64_DARK_GREY, Colour.C64_GREY, Colour.C64_LIGHT_GREEN, Colour.C64_LIGHT_BLUE, Colour.C64_LIGHT_GREY, Colour.C64_WHITE] },
    ];

    constructor(container: HTMLElement, easing: Easing) {
        for (const sample of this._gradientSamples) {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            container.appendChild(item);

            const nameLabel = document.createElement('div');
            nameLabel.className = 'gallery-name';
            nameLabel.textContent = sample.name;
            item.appendChild(nameLabel);

            const mapper = ColourMapper.fromColours(sample.colours, easing);
            const band = new GradientBand(item, mapper, 40);

            this._entries.push({ colours: sample.colours, band });
        }
    }

    public setEasing(easing: Easing): void {
        for (const entry of this._entries) {
            const mapper = ColourMapper.fromColours(entry.colours, easing);
            entry.band.setSource(mapper);
        }
    }
}
