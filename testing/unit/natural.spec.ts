import {Natural, NaturalGalleryOptions} from '../../src';
import {ModelAttributes} from '../../src/js/galleries/AbstractGallery';
import {Item} from '../../src/js/Item';
import * as domino from 'domino';

export function getSize<T extends ModelAttributes>({
    width,
    height,
    row,
}: Item<T>): Pick<Item<T>, 'width' | 'height' | 'row'> {
    return {width, height, row};
}

const imageModel: ModelAttributes = {
    thumbnailSrc: 'thumbnailSrc',
    enlargedSrc: 'enlargedSrc',
    enlargedWidth: 1980,
    enlargedHeight: 1080,
    title: 'title 1',
    color: 'color',
};

describe('Natural Gallery', () => {
    test('options should be completed and overriden', () => {
        const result: NaturalGalleryOptions = {
            rowHeight: 123, // new attribute
            gap: 4, // overriden attribute
            rowsPerPage: 0,
            showLabels: 'hover',
            lightbox: false,
            minRowsAtStart: 2,
            selectable: false,
            activable: false,
            infiniteScrollOffset: 0,
            photoSwipeOptions: {
                loop: false,
            },
            photoSwipePluginsInitFn: null,
            ssr: {
                galleryWidth: 480,
            },
        };

        const gallery = new Natural(document.createElement('div'), {rowHeight: 123, gap: 4});
        expect(gallery.getOptions()).toEqual(result);
    });

    test('should add items before creation and not render them', () => {
        const images = [imageModel, imageModel, imageModel, imageModel, imageModel, imageModel];
        const gallery = new Natural(document.createElement('div'), {rowHeight: 123});
        gallery.addItems(images);

        expect(gallery.collection.length).toEqual(6);
        expect(gallery.domCollection.length).toEqual(0);
    });

    test('should return row height', () => {
        const images = [
            {
                enlargedWidth: 6000,
                enlargedHeight: 4000,
            },
            {
                enlargedWidth: 3648,
                enlargedHeight: 5472,
            },
            {
                title: '2',
                enlargedWidth: 5472,
                enlargedHeight: 3648,
            },
        ];

        const rowHeight1 = Natural.getRowHeight(images, 1000, 0, {});
        expect(rowHeight1).toBe(272.72727272727275);

        const rowHeight2 = Natural.getRowHeight(images, 1000, 10, {});
        expect(rowHeight2).toBe(267.2727272727273);

        expect(rowHeight2).toBeLessThan(rowHeight1);
    });

    test('should organize items that dont fill the line', () => {
        const images: ModelAttributes[] = [
            {
                thumbnailSrc: 'foo.jpg',
                enlargedWidth: 6000,
                enlargedHeight: 4000,
            },
            {
                thumbnailSrc: 'bar.jpg',
                enlargedWidth: 3648,
                enlargedHeight: 5472,
            },
        ];

        const container = {getBoundingClientRect: () => ({width: 999})} as HTMLElement;
        const gallery = new Natural(container, {rowHeight: 400});
        gallery.addItems(images);
        gallery.organizeItems(gallery.collection, 0, 999);

        const result = [
            {width: 600, height: 400, row: 0},
            {width: 267, height: 400, row: 0},
        ];

        expect(gallery.collection.map(getSize)).toEqual(result);
    });

    test('should organize items that overflow first line with no gap', () => {
        const images: ModelAttributes[] = [
            {
                thumbnailSrc: 'foo.jpg',
                enlargedWidth: 6000,
                enlargedHeight: 4000,
            },
            {
                thumbnailSrc: 'bar.jpg',
                enlargedWidth: 3648,
                enlargedHeight: 5472,
            },
            {
                thumbnailSrc: 'foo 2.jpg',
                title: '2',
                enlargedWidth: 5472,
                enlargedHeight: 3648,
            },
            {
                thumbnailSrc: 'foo 3.jpg',
                title: '3',
                enlargedWidth: 3456,
                enlargedHeight: 5184,
            },
            {
                thumbnailSrc: 'foo 4.jpg',
                title: '4',
                enlargedWidth: 3264,
                enlargedHeight: 4894,
            },
        ];

        const container = {getBoundingClientRect: () => ({width: 999})} as HTMLElement;
        const gallery = new Natural(container, {rowHeight: 400, gap: 0});
        gallery.addItems(images);
        gallery.organizeItems(gallery.collection, 0, 999);

        const result = [
            {width: 408, height: 272, row: 0},
            {width: 182, height: 272, row: 0},
            {width: 409, height: 272, row: 0},
            {width: 266, height: 400, row: 1},
            {width: 267, height: 400, row: 1},
        ];

        expect(gallery.collection.map(getSize)).toEqual(result);
    });

    test('should organize items that overflow first line with gap Angular', () => {
        const images: ModelAttributes[] = [
            {
                thumbnailSrc: 'foo.jpg',
                enlargedWidth: 6000,
                enlargedHeight: 4000,
            },
            {
                thumbnailSrc: 'bar.jpg',
                enlargedWidth: 3648,
                enlargedHeight: 5472,
            },
            {
                thumbnailSrc: 'foo 2.jpg',
                title: '2',
                enlargedWidth: 5472,
                enlargedHeight: 3648,
            },
            {
                thumbnailSrc: 'foo 3.jpg',
                title: '3',
                enlargedWidth: 3456,
                enlargedHeight: 5184,
            },
            {
                thumbnailSrc: 'foo 4.jpg',
                title: '4',
                enlargedWidth: 3264,
                enlargedHeight: 4894,
            },
        ];

        const container = {getBoundingClientRect: () => ({width: 999})} as HTMLElement;
        const gallery = new Natural(container, {rowHeight: 400, gap: 20});
        gallery.addItems(images);
        gallery.organizeItems(gallery.collection, 0, 999);

        const result = [
            {width: 392, height: 261, row: 0},
            {width: 174, height: 261, row: 0},
            {width: 393, height: 261, row: 0},
            {width: 266, height: 400, row: 1},
            {width: 267, height: 400, row: 1},
        ];

        expect(gallery.collection.map(getSize)).toEqual(result);
    });

    test('should be compatible with Angular SSR', () => {
        const images: ModelAttributes[] = [
            {
                thumbnailSrc: 'foo.jpg',
                enlargedWidth: 6000,
                enlargedHeight: 4000,
            },
            {
                thumbnailSrc: 'bar.jpg',
                enlargedWidth: 3648,
                enlargedHeight: 5472,
            },
            {
                thumbnailSrc: 'foo 2.jpg',
                title: '2',
                enlargedWidth: 5472,
                enlargedHeight: 3648,
            },
            {
                thumbnailSrc: 'foo 3.jpg',
                title: '3',
                enlargedWidth: 3456,
                enlargedHeight: 5184,
            },
            {
                thumbnailSrc: 'foo 4.jpg',
                title: '4',
                enlargedWidth: 3264,
                enlargedHeight: 4894,
            },
        ];

        const window = domino.createWindow('<h1>Hello world</h1>', 'http://example.com');
        const document = window.document;
        const container = document.createElement('div');

        const gallery = new Natural(container, {rowHeight: 400, gap: 20, selectable: true});
        gallery.addItems(images);
        gallery.organizeItems(gallery.collection, 0, 999);

        const result = [
            {width: 480, height: 320, row: 0},
            {width: 141, height: 212, row: 1},
            {width: 319, height: 212, row: 1},
            {width: 229, height: 344, row: 2},
            {width: 231, height: 344, row: 2},
        ];

        expect(gallery.collection.map(getSize)).toEqual(result);
    });
});

test('Item should have accessible attributes', () => {
    const window = domino.createWindow();
    const document = window.document;
    const model = {
        thumbnailSrc: 'foo.jpg',
        enlargedWidth: 600,
        enlargedHeight: 400,
        title: 'My Image',
        caption: 'A description for screen readers',
        link: 'https://example.com',
    };
    const item = new Item(document, {lightbox: true, showLabels: 'always'}, model);
    const el = item.init();

    // Check alt attribute
    const img = el.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('My Image');

    // Check that aria-label is NOT present on img
    expect(img?.hasAttribute('aria-label')).toBe(false);

    // Check <figcaption>
    const figcaption = el.querySelector('figcaption');
    expect(figcaption?.textContent).toBe('A description for screen readers');

    // Check select button accessibility
    const selectBtn = el.querySelector('.selectBtn');
    if (selectBtn) {
        expect(selectBtn.getAttribute('role')).toBe('button');
        expect(selectBtn.getAttribute('tabindex')).toBe('0');
        expect(selectBtn.getAttribute('aria-label')).toBe('Select image');
    }
});

test('Item should render label inside link when both title and link are present', () => {
    const window = domino.createWindow();
    const document = window.document;
    const model = {
        thumbnailSrc: 'foo.jpg',
        enlargedWidth: 600,
        enlargedHeight: 400,
        title: 'My Image',
        link: 'https://example.com',
    };
    const item = new Item(document, {showLabels: 'always'}, model);
    const el = item.init();

    const link = el.querySelector('a.link');
    expect(link).not.toBeNull();
    expect(link?.querySelector('.title')?.textContent).toBe('My Image');
});
