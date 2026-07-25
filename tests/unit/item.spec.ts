import {Item, ItemOptions} from '../../src';
import {LabelVisibility} from '../../src';
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from 'vitest';
import {ModelAttributes} from '../../src';
import {click, key} from './utils';

type EventVariant = {click: boolean; enter: boolean; space: boolean};

// ES for Enter and Space keys
const NO_EVENT: EventVariant = {click: false, enter: false, space: false};
const CLICK: EventVariant = {click: true, enter: false, space: false};
const ALL_EVENTS: EventVariant = {click: true, enter: true, space: true};

type SemanticItem = {
    item: Item<ModelAttributes>;
    root: HTMLElement;
    image: HTMLElement;
    caption: HTMLElement | null;
    link: HTMLElement | HTMLButtonElement | null;
    select: HTMLElement | null;
};

type ItemExpectation = {
    warn: number;
    select: EventVariant | null;
    root: ElementExpectation;
    image: ElementExpectation;
    caption: ElementExpectation | null;
    link: ElementExpectation | null;
};

type ElementExpectation = {
    tag?: string;
    href?: string | null;
    linkTarget?: string | null;
    text?: string;
    alt?: string | null;
    ariaLabel: string | null;
    tabindex: string | null;
    zoom: EventVariant;
    activate: EventVariant;
};

function createItem(
    document: Document,
    model: Partial<ModelAttributes> = {},
    options: Partial<ItemOptions> = {},
): SemanticItem {
    const defaultModel = {
        thumbnailSrc: 'image.jpg',
        enlargedWidth: 600,
        enlargedHeight: 400,
        ...model,
    };

    const defaultOptions = {
        labelVisibility: LabelVisibility.NEVER,
        lightbox: false,
        ...options,
    };

    const item = new Item(document, defaultOptions, defaultModel);
    const root = item.init();

    return {
        item: item,
        root,
        image: root.querySelector('img')!,
        caption: root.querySelector('figcaption'),
        link: root.querySelector('a') ?? root.querySelector('figcaption button'),
        select: root.querySelector('.select-btn'),
    };
}

function testItem(item: SemanticItem, expected: ItemExpectation, warnSpy: MockInstance): void {
    expect(warnSpy).toHaveBeenCalledTimes(expected.warn);
    warnSpy.mockClear();

    testHTMLElement(item.root, expected.root, item.root);
    testHTMLElement(item.root, expected.image, item.image);

    if (expected.caption === null) {
        expect(item.caption).toBe(null);
    } else {
        testHTMLElement(item.root, expected.caption, item.caption);
    }

    if (expected.link === null) {
        expect(item.link).toBe(null);
    } else {
        testHTMLElement(item.root, expected.link, item.link);
    }

    if (expected.select === null) {
        expect(item.select).toBe(null);
    } else {
        expectEvent(item.root, click(), item.select!, 'select', expected.select.click);
        expectEvent(item.root, key('Enter'), item.select!, 'select', expected.select.enter);
        expectEvent(item.root, key(' '), item.select!, 'select', expected.select.space);
    }
}

function testHTMLElement(root: HTMLElement, expected: ElementExpectation, target?: HTMLElement | null): void {
    expect(target).toBeDefined();

    if (expected.tag !== undefined) {
        expect(target!.tagName).toBe(expected.tag);
    }
    if (expected.href !== undefined) {
        expect(target!.getAttribute('href')).toBe(expected.href);
    }
    if (expected.text !== undefined) {
        expect(target!.textContent).toBe(expected.text);
    }
    if (expected.alt !== undefined) {
        expect(target!.getAttribute('alt')).toBe(expected.alt);
    }

    expect(target!.getAttribute('aria-label')).toBe(expected.ariaLabel);
    expect(target!.getAttribute('tabindex')).toBe(expected.tabindex);

    expectEvent(root, click(), target!, 'zoom', expected.zoom.click);
    expectEvent(root, key('Enter'), target!, 'zoom', expected.zoom.enter);
    expectEvent(root, key(' '), target!, 'zoom', expected.zoom.space);

    expectEvent(root, click(), target!, 'activate', expected.activate.click);
    expectEvent(root, key('Enter'), target!, 'activate', expected.activate.enter);
    expectEvent(root, key(' '), target!, 'activate', expected.activate.space);
}

function expectEvent(
    root: HTMLElement,
    triggerEvent: Event,
    eventTarget: HTMLElement,
    outputEvent: string,
    expected: boolean,
): void {
    const eventSpy = vi.fn();
    root.addEventListener(outputEvent, eventSpy);
    eventTarget.dispatchEvent(triggerEvent);
    if (expected) {
        expect(eventSpy).toHaveBeenCalled();
    } else {
        expect(eventSpy).not.toHaveBeenCalled();
    }
    root.removeEventListener(outputEvent, eventSpy);
}

describe('Item', () => {
    let mockDocument: Document;
    let consoleWarnSpy: MockInstance;

    afterEach(() => consoleWarnSpy.mockRestore());
    beforeEach(() => {
        mockDocument = document;
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('should setup link target', () => {
        const item = createItem(mockDocument, {title: 'My title', link: 'https://example.com', linkTarget: '_blank'});
        testItem(
            item,
            {
                warn: 0,
                select: null,
                root: {
                    tag: 'A',
                    ariaLabel: null,
                    alt: null,
                    tabindex: null,
                    href: 'https://example.com',
                    linkTarget: '_blank',
                    zoom: NO_EVENT,
                    activate: NO_EVENT,
                },
                image: {
                    ariaLabel: null,
                    alt: 'My title',
                    tabindex: null,
                    href: null,
                    zoom: NO_EVENT,
                    activate: NO_EVENT,
                },
                caption: null,
                link: null,
            },
            consoleWarnSpy,
        );
    });

    it('should have hoverable link', () => {
        const item = createItem(mockDocument, {title: 'My title'}, {labelVisibility: LabelVisibility.HOVER});
        expect(item.caption?.classList.contains('hover')).toBe(true);

        item.item.setLabelHover(false);
        expect(item.caption?.classList.contains('hover')).toBe(false);
        item.item.setLabelHover(true);
        expect(item.caption?.classList.contains('hover')).toBe(true);
    });

    it('should render caption when label visibility is hover and title is set', () => {
        const item = createItem(mockDocument, {title: 'My title'}, {labelVisibility: LabelVisibility.HOVER});
        expect(item.caption).not.toBeNull();
    });

    it('should not render caption when title is missing', () => {
        const item = createItem(mockDocument, {title: ''}, {labelVisibility: LabelVisibility.ALWAYS});
        expect(item.caption).toBeNull();
    });

    it('should use title as alt when label is hidden', () => {
        const item = createItem(mockDocument, {title: 'My title'}, {labelVisibility: LabelVisibility.NEVER});
        expect(item.caption).toBeNull();
        expect(item.image.getAttribute('alt')).toBe('My title');
    });

    it('should use empty alt when label is shown', () => {
        const item = createItem(mockDocument, {title: 'My title'}, {labelVisibility: LabelVisibility.ALWAYS});
        expect(item.caption).not.toBeNull();
        expect(item.image.getAttribute('alt')).toBe('');
    });

    it('should remove item from DOM', () => {
        const item = createItem(mockDocument, {title: 'My title'}, {labelVisibility: LabelVisibility.HOVER});

        mockDocument.body.appendChild(item.root);
        expect(item.root.parentNode).toBe(mockDocument.body);
        item.item.remove();
        expect(item.root.parentNode).toBe(null);
    });

    it('should should set transparent background color', () => {
        const item = createItem(mockDocument, {title: 'My title', color: '#ffffff'});
        expect(item.root.style.backgroundColor).toEqual('rgba(255, 255, 255, 0.067)');
    });

    it('should attach accessible description and aria-describedby', () => {
        const item = createItem(mockDocument, {
            title: 'My title',
            accessibleDescription: 'Long description for screen readers.',
        });

        const description = item.root.querySelector('.ngjs-sr-only') as HTMLElement | null;
        expect(description).not.toBeNull();
        expect(description?.textContent).toBe('Long description for screen readers.');
        expect(item.image.getAttribute('aria-describedby')).toBe(description?.id);
    });

    it('should not let the accessible description suppress the alt', () => {
        const item = createItem(mockDocument, {
            title: 'My title',
            accessibleDescription: 'Long description for screen readers.',
        });

        // Without a caption the title is the accessible name, and the description only complements
        // it. The alt is decided by the caption alone, the description never takes part in it.
        expect(item.image.getAttribute('alt')).toBe('My title');
        expect(item.image.getAttribute('aria-describedby')).not.toBeNull();
    });

    it('should set empty alt when accessible description is provided with caption', () => {
        const item = createItem(
            mockDocument,
            {title: 'My title', accessibleDescription: 'Long description for screen readers.'},
            {labelVisibility: LabelVisibility.ALWAYS},
        );

        expect(item.caption).not.toBeNull();
        expect(item.image.getAttribute('alt')).toBe('');
    });

    it('should keep explicit alt when accessible description is provided', () => {
        const item = createItem(mockDocument, {
            title: 'My title',
            alt: 'My alt',
            accessibleDescription: 'Long description for screen readers.',
        });

        expect(item.image.getAttribute('alt')).toBe('My alt');
    });

    it('should name the zoom control after the item', () => {
        const first = createItem(mockDocument, {title: 'First photo'}, {lightbox: true});
        const second = createItem(mockDocument, {title: 'Second photo'}, {lightbox: true});

        // Every zoomable item used to be labelled "zoom", leaving a screen reader user with no way
        // to tell one item of the gallery from the next.
        expect(first.root.getAttribute('aria-label')).toBe('Zoom: First photo');
        expect(second.root.getAttribute('aria-label')).toBe('Zoom: Second photo');
        expect(first.root.getAttribute('aria-label')).not.toBe(second.root.getAttribute('aria-label'));
    });

    it('should fall back to a generic zoom label when there is no title', () => {
        const item = createItem(mockDocument, {}, {lightbox: true});
        expect(item.root.getAttribute('aria-label')).toBe('Zoom image');
    });

    it('should name the zoom control when the image carries the zoom, not the figure', () => {
        // With a caption and a link the image is the zoomable element, and it has no figcaption
        // inside it to fall back on, so it needs the label of its own.
        const item = createItem(
            mockDocument,
            {title: 'My title', link: 'https://example.com'},
            {labelVisibility: LabelVisibility.ALWAYS, lightbox: true},
        );

        expect(item.image.getAttribute('aria-label')).toBe('Zoom: My title');
    });

    it('should expose the accessible description as text, not markup', () => {
        const item = createItem(mockDocument, {
            title: 'My title',
            accessibleDescription: 'shot at 50mm <f/1.8> handheld',
        });

        const description = item.root.querySelector('.ngjs-sr-only') as HTMLElement;
        // Text is preserved verbatim, and nothing inside it becomes an element.
        expect(description.textContent).toBe('shot at 50mm <f/1.8> handheld');
        expect(description.children.length).toBe(0);
    });

    it('should not build elements from an accessible description', () => {
        const item = createItem(mockDocument, {
            title: 'My title',
            accessibleDescription: '<img src=x onerror="alert(1)" alt="a sunset',
        });

        const description = item.root.querySelector('.ngjs-sr-only') as HTMLElement;
        // The old regex sanitizer let an unclosed tag through, and `innerHTML` then built it.
        expect(description.querySelector('img')).toBeNull();
        expect(description.children.length).toBe(0);
        expect(description.textContent).toBe('<img src=x onerror="alert(1)" alt="a sunset');
    });

    it('should render a title containing <br> as a line break', () => {
        const item = createItem(
            mockDocument,
            {title: 'First line<br>second line'},
            {labelVisibility: LabelVisibility.ALWAYS},
        );

        expect(item.caption!.querySelectorAll('br').length).toBe(1);
        expect(item.caption!.textContent).toBe('First linesecond line');
    });

    it('should not build markup from a title', () => {
        const item = createItem(
            mockDocument,
            {title: 'boom <img src=x onerror="window.__xss = 1" alt="x'},
            {labelVisibility: LabelVisibility.ALWAYS},
        );

        // The unclosed tag used to survive the regex sanitizer and reach innerHTML.
        expect(item.caption!.querySelector('img')).toBeNull();
        expect(item.caption!.querySelectorAll('*').length).toBe(0);
        expect(item.caption!.textContent).toBe('boom ');
    });

    it('should render no caption when the title is nothing but markup', () => {
        const item = createItem(
            mockDocument,
            {title: '<img src=x onerror="window.__xss = 1" alt="boom'},
            {labelVisibility: LabelVisibility.ALWAYS},
        );

        // Nothing survives sanitizing, so there is no label to show.
        expect(item.item.sanitizedTitle).toBe('');
        expect(item.caption).toBeNull();
    });

    it('should strip tags from a title, as before', () => {
        const item = createItem(
            mockDocument,
            {title: 'foo <strong>bar</strong> baz'},
            {labelVisibility: LabelVisibility.ALWAYS},
        );

        expect(item.caption!.querySelector('strong')).toBeNull();
        expect(item.caption!.textContent).toBe('foo bar baz');
    });

    it('should render the title into the link when there is one', () => {
        const item = createItem(
            mockDocument,
            {title: 'Left<br>Right', link: 'https://example.com'},
            {labelVisibility: LabelVisibility.ALWAYS},
        );

        expect(item.link!.querySelectorAll('br').length).toBe(1);
        expect(item.link!.textContent).toBe('LeftRight');
    });

    it('should flatten <br> out of plain-text contexts', () => {
        const item = createItem(mockDocument, {title: 'First line<br>second line'}, {lightbox: true});

        // alt and aria-label cannot hold markup, and a literal "<br>" would be announced as text.
        expect(item.item.sanitizedTitle).toBe('First line second line');
        expect(item.image.getAttribute('alt')).toBe('First line second line');
        expect(item.root.getAttribute('aria-label')).toBe('Zoom: First line second line');
    });

    it('should initialize item unchecked', () => {
        const item = createItem(mockDocument, {title: 'My title'}, {selectable: true});
        expect(item.select?.getAttribute('aria-checked')).toBe('false');
    });

    it('should initialize item checked', () => {
        const item = createItem(mockDocument, {title: 'My title', selected: true}, {selectable: true});
        expect(item.select?.getAttribute('aria-checked')).toBe('true');
    });

    it('should reflect selected status to aria', () => {
        const item = createItem(mockDocument, {title: 'My title'}, {selectable: true});
        expect(item.select?.getAttribute('aria-checked')).toBe('false');
        item.select?.click();
        expect(item.select?.getAttribute('aria-checked')).toBe('true');
        item.select?.click();
        expect(item.select?.getAttribute('aria-checked')).toBe('false');
    });

    const testWithSelectable = (selectable: boolean, events: EventVariant | null) => {
        const suffix = selectable ? ', selectable' : '';

        it('should render image with alt and no interaction' + suffix, () => {
            const item = createItem(mockDocument, {title: 'My title'}, {selectable});
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    caption: null,
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + no interaction' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {ariaLabel: null, alt: '', tabindex: null, href: null, zoom: NO_EVENT, activate: NO_EVENT},
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + meaningful alt + no interaction' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My alt'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable},
            );

            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My alt',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + no identical alt + no interaction' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My title'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {ariaLabel: null, alt: '', tabindex: null, href: null, zoom: NO_EVENT, activate: NO_EVENT},
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should zoom' + suffix, () => {
            const item = createItem(mockDocument, {title: 'My title'}, {selectable, lightbox: true});
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: 'Zoom: My title',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: CLICK,
                        activate: NO_EVENT,
                    },
                    caption: null,
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + zoom' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: 'Zoom: My title',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    image: {ariaLabel: null, alt: '', tabindex: null, href: null, zoom: CLICK, activate: NO_EVENT},
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: CLICK,
                        activate: NO_EVENT,
                    },
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + zoom + meaningful alt' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My alt'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: 'Zoom: My title',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My alt',
                        tabindex: null,
                        href: null,
                        zoom: CLICK,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: CLICK,
                        activate: NO_EVENT,
                    },
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + zoom + ignore identical alt' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My title'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: 'Zoom: My title',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    image: {ariaLabel: null, alt: '', tabindex: null, href: null, zoom: CLICK, activate: NO_EVENT},
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: CLICK,
                        activate: NO_EVENT,
                    },
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render ignored link + zoom + alt' + suffix, () => {
            // Specific case, link is ignored
            const item = createItem(
                mockDocument,
                {alt: 'My alt', link: 'https://example.com'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 1,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: 'Zoom image',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My alt',
                        tabindex: null,
                        href: null,
                        zoom: CLICK,
                        activate: NO_EVENT,
                    },
                    caption: null,
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render link + caption + zoom' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', link: 'https://example.com'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: '',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: 'https://example.com',
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                },
                consoleWarnSpy,
            );
        });

        it('should render link + caption + zoom + meaningful alt' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My alt', link: 'https://example.com'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: 'My alt',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: 'https://example.com',
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                },
                consoleWarnSpy,
            );
        });

        it('should render link + caption + zoom + ignore identical alt' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My title', link: 'https://example.com'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: '',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: 'https://example.com',
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                },
                consoleWarnSpy,
            );
        });

        /**
         * Activable
         */
        const activeLink: ElementExpectation = {
            tag: 'a',
            ariaLabel: 'activate item',
            text: 'My title',
            tabindex: '0',
            href: null,
            zoom: NO_EVENT,
            activate: ALL_EVENTS,
        };

        it('should render image with alt and activable' + suffix, () => {
            const item = createItem(mockDocument, {title: 'My title'}, {selectable, activable: true});
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'BUTTON',
                        ariaLabel: 'activate item',
                        tabindex: '0',
                        href: null,
                        zoom: NO_EVENT,
                        activate: ALL_EVENTS,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: CLICK,
                    },
                    caption: null,
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {ariaLabel: null, alt: '', tabindex: null, href: null, zoom: NO_EVENT, activate: NO_EVENT},
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {...activeLink, tag: 'BUTTON'},
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + meaningful alt + activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My alt'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true},
            );

            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My alt',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {...activeLink, tag: 'BUTTON'},
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + no identical alt + activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My title'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {ariaLabel: null, alt: '', tabindex: null, href: null, zoom: NO_EVENT, activate: NO_EVENT},
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {...activeLink, tag: 'BUTTON'},
                },
                consoleWarnSpy,
            );
        });

        it('should zoom, activable' + suffix, () => {
            const item = createItem(mockDocument, {title: 'My title'}, {selectable, activable: true, lightbox: true});
            testItem(
                item,
                {
                    warn: 1,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: 'Zoom: My title',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: CLICK,
                        activate: NO_EVENT,
                    },
                    caption: null,
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + zoom, activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: '',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {...activeLink, tag: 'BUTTON'},
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + zoom + meaningful alt, activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My alt'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: 'My alt',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {...activeLink, tag: 'BUTTON'},
                },
                consoleWarnSpy,
            );
        });

        it('should render caption + zoom + ignore identical alt, activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My title'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: '',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {...activeLink, tag: 'BUTTON'},
                },
                consoleWarnSpy,
            );
        });

        it('should render ignored link + zoom + alt, activable' + suffix, () => {
            // Specific case, link is ignored
            const item = createItem(
                mockDocument,
                {alt: 'My alt', link: 'https://example.com'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 1,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: 'Zoom image',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: null,
                        alt: 'My alt',
                        tabindex: null,
                        href: null,
                        zoom: CLICK,
                        activate: NO_EVENT,
                    },
                    caption: null,
                    link: null,
                },
                consoleWarnSpy,
            );
        });

        it('should render link + caption + zoom, activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', link: 'https://example.com'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: '',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: 'https://example.com',
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                },
                consoleWarnSpy,
            );
        });

        it('should render link + caption + zoom + meaningful alt, activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My alt', link: 'https://example.com'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: 'My alt',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: 'https://example.com',
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                },
                consoleWarnSpy,
            );
        });

        it('should render link + caption + zoom + ignore identical alt, activable' + suffix, () => {
            const item = createItem(
                mockDocument,
                {title: 'My title', alt: 'My title', link: 'https://example.com'},
                {labelVisibility: LabelVisibility.ALWAYS, selectable, activable: true, lightbox: true},
            );
            testItem(
                item,
                {
                    warn: 0,
                    select: events,
                    root: {
                        tag: 'FIGURE',
                        ariaLabel: null,
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    image: {
                        ariaLabel: 'Zoom: My title',
                        alt: '',
                        tabindex: '0',
                        href: null,
                        zoom: ALL_EVENTS,
                        activate: NO_EVENT,
                    },
                    caption: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: null,
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                    link: {
                        ariaLabel: null,
                        text: 'My title',
                        tabindex: null,
                        href: 'https://example.com',
                        zoom: NO_EVENT,
                        activate: NO_EVENT,
                    },
                },
                consoleWarnSpy,
            );
        });
    };

    it('should render plain figure when no lightbox, no caption and no link', () => {
        const item = createItem(document, {});
        expect(item.root.tagName).toBe('FIGURE');
        expect(item.caption).toBeNull();
        expect(item.link).toBeNull();
    });

    it('should not fire zoom on non-Enter/Space keydown', () => {
        const item = createItem(document, {}, {lightbox: true});
        const spy = vi.fn();
        item.root.addEventListener('zoom', spy);
        // With lightbox=true and no caption/link, the root figure itself is the zoomable element
        item.root.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab'}));
        expect(spy).not.toHaveBeenCalled();
    });

    it('should not fire select on non-Enter/Space keydown', () => {
        const item = createItem(document, {}, {selectable: true});
        const spy = vi.fn();
        item.root.addEventListener('select', spy);
        item.select!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab'}));
        expect(spy).not.toHaveBeenCalled();
    });

    it('should not fire activate on non-Enter/Space keydown', () => {
        const item = createItem(document, {title: 'test'}, {activable: true, labelVisibility: LabelVisibility.ALWAYS});
        const activation = item.root.querySelector<HTMLElement>('.activation')!;
        const spy = vi.fn();
        item.root.addEventListener('activate', spy);
        activation.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab'}));
        expect(spy).not.toHaveBeenCalled();
    });

    it('should add loaded class when image fires load event', () => {
        const item = createItem(document, {});
        const img = item.root.querySelector('img')!;
        expect(item.root.classList.contains('loaded')).toBe(false);
        img.dispatchEvent(new Event('load'));
        expect(item.root.classList.contains('loaded')).toBe(true);
    });

    testWithSelectable(false, null);
    testWithSelectable(true, ALL_EVENTS);
});
