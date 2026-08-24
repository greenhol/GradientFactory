import { filter } from 'rxjs';
import { Easing } from '../shared/colour/colour-mapper';
import { configVersionCheck, ModuleConfig } from '../shared/config';
import { GallerySection } from './gallery-section';
import { ColourOrder } from './image-colour-extractor';
import { ExtractorConfig, ImagePaletteSection } from './image-palette-section';
import { PlaygroundSection } from './playground-section';
import { RandomizerConfig, RandomizerSection } from './randomizer-section';

declare const APP_NAME: string;
declare const APP_VERSION: string;

interface MainConfig {
    easing: Easing,
    playgroundString: string;
    randomizer: RandomizerConfig;
    extractor: ExtractorConfig;
}

export class Start {

    private _config: ModuleConfig<MainConfig>;
    private readonly _playground: PlaygroundSection;
    private readonly _randomizer: RandomizerSection;
    private readonly _image: ImagePaletteSection;
    private readonly _gallery: GallerySection;

    constructor() {
        console.log(`#${APP_NAME} - Version:${APP_VERSION}`);
        configVersionCheck();
        this._config = new ModuleConfig<MainConfig>({
            easing: Easing.RGB_LINEAR,
            playgroundString: '0:#000000, 0.5:#FFFFFF, 1:#000000',
            randomizer: {
                seed: -1,
                count: 5,
                lMin: 0,
                lMax: 1,
                cMin: 0,
                cMax: 0.5,
            },
            extractor: {
                points: 5,
                vividness: 50,
                order: ColourOrder.LIGHTNESS,
            }
        }, 'mainConfig' + APP_NAME);

        const root = document.getElementById('main');
        if (!root) {
            throw new Error('Start: could not find #main element to mount GradientPage into');
        }

        root.innerHTML = '';

        const configSection = document.createElement('section');
        configSection.appendChild(this.buildSectionLabel('Config'));
        configSection.appendChild(this.buildEasingDropdown());
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'div-button';
        button.textContent = 'Reset config';
        button.addEventListener('click', () => this.resetConfig());
        configSection.appendChild(button);
        root.appendChild(configSection);

        const playgroundSection = document.createElement('section');
        playgroundSection.appendChild(this.buildSectionLabel('Work Bench'));
        root.appendChild(playgroundSection);
        this._playground = new PlaygroundSection(playgroundSection, this._config.data.playgroundString, this._config.data.easing);

        const randomizerSection = document.createElement('section');
        randomizerSection.appendChild(this.buildSectionLabel('Randomizer'));
        root.appendChild(randomizerSection);
        this._randomizer = new RandomizerSection(randomizerSection, this._config.data.randomizer, this._config.data.easing);

        const imageSection = document.createElement('section');
        imageSection.appendChild(this.buildSectionLabel('Image Extractor'));
        root.appendChild(imageSection);
        this._image = new ImagePaletteSection(imageSection, this._config.data.extractor, this._config.data.easing);

        const gallerySection = document.createElement('section');
        gallerySection.appendChild(this.buildSectionLabel('Gallery'));
        root.appendChild(gallerySection);
        this._gallery = new GallerySection(gallerySection, this._config.data.easing);

        this._playground.gradientString$
            .pipe(filter((gradientString) => gradientString != null))
            .subscribe({ next: (gradientString) => { this._config.data.playgroundString = gradientString; } });
    }

    private resetConfig() {
        this._config.reset();
        location.reload();
    }

    private buildSectionLabel(text: string): HTMLDivElement {
        const label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = text;
        return label;
    }

    private buildEasingDropdown(): HTMLSelectElement {
        const select = document.createElement('select');
        select.id = 'easing-selector';

        for (const value of Object.values(Easing)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        }

        select.value = this._config.data.easing;
        select.addEventListener('change', () => {
            this._config.data.easing = select.value as Easing;
            this._playground.setEasing(this._config.data.easing);
            this._randomizer.setEasing(this._config.data.easing);
            this._image.setEasing(this._config.data.easing);
            this._gallery.setEasing(this._config.data.easing);
        });

        return select;
    }
}