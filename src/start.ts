import { filter } from 'rxjs';
import { Easing } from '../shared/colour/colour-mapper';
import { configVersionCheck, ModuleConfig } from '../shared/config';
import { GallerySection } from './gallery-section';
import { PlaygroundSection } from './playground-section';

declare const APP_NAME: string;
declare const APP_VERSION: string;

interface MainConfig {
    easing: Easing,
    playgroundString: string;
}

export class Start {

    private _config: ModuleConfig<MainConfig>;
    private readonly _playground: PlaygroundSection;
    private readonly _gallery: GallerySection;

    constructor() {
        console.log(`#${APP_NAME} - Version:${APP_VERSION}`);
        configVersionCheck();
        this._config = new ModuleConfig<MainConfig>({
            easing: Easing.RGB_LINEAR,
            playgroundString: '0:#000000, 0.5:#FFFFFF, 1:#000000',
        }, 'mainConfig' + APP_NAME);

        const root = document.getElementById('main');
        if (!root) {
            throw new Error('Start: could not find #main element to mount GradientPage into');
        }

        root.innerHTML = ''; // clear placeholder content

        const easingSection = document.createElement('section');
        easingSection.appendChild(this.buildLabel('Interpolation'));
        easingSection.appendChild(this.buildEasingDropdown());
        root.appendChild(easingSection);

        const playgroundSection = document.createElement('section');
        playgroundSection.appendChild(this.buildLabel('Playground'));
        root.appendChild(playgroundSection);
        this._playground = new PlaygroundSection(playgroundSection, this._config.data.playgroundString, this._config.data.easing);

        const gallerySection = document.createElement('section');
        gallerySection.appendChild(this.buildLabel('Gallery'));
        const galleryGrid = document.createElement('div');
        galleryGrid.className = 'gallery-grid';
        gallerySection.appendChild(galleryGrid);
        root.appendChild(gallerySection);
        this._gallery = new GallerySection(galleryGrid, this._config.data.easing);

        this._playground.gradientString$
            .pipe(filter((gradientString) => gradientString != null))
            .subscribe({ next: (gradientString) => { this._config.data.playgroundString = gradientString; } });
    }

    private buildLabel(text: string): HTMLDivElement {
        const label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = text;
        return label;
    }

    private buildEasingDropdown(): HTMLSelectElement {
        const select = document.createElement('select');
        select.className = 'easing-select';

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
            this._gallery.setEasing(this._config.data.easing);
        });

        return select;
    }
}