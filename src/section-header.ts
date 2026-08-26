export function buildSectionHeader(title: string, rightControl?: HTMLElement): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'section-header';

    const label = document.createElement('span');
    label.className = 'section-header-title';
    label.textContent = title;
    header.appendChild(label);

    if (rightControl) {
        header.appendChild(rightControl);
    }

    return header;
}
