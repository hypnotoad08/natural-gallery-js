import {
    getImageRatio,
    getImageRatioAndIfCropped,
    getNextIcon,
    renderSanitizedHtml,
    sanitizeHtml,
    sanitizeToPlainText,
} from '../../src/js/Utility';
import * as domino from 'domino';
import {describe, expect, it} from 'vitest';

describe('Utility', () => {
    it('should limit image ratio', () => {
        const ratios = getImageRatio({enlargedWidth: 6000, enlargedHeight: 4000}, {});
        expect(ratios).toBe(1.5);

        const ratios2 = getImageRatio({enlargedWidth: 6000, enlargedHeight: 4000}, {min: 2});
        expect(ratios2).toBe(2);

        const ratios3 = getImageRatio({enlargedWidth: 6000, enlargedHeight: 4000}, {max: 1});
        expect(ratios3).toBe(1);
    });

    it('should return ratio unchanged when no ratioLimits', () => {
        const ratio = getImageRatio({enlargedWidth: 6000, enlargedHeight: 4000});
        expect(ratio).toBe(1.5);
    });

    it('should return ratio unchanged when within min and max bounds', () => {
        const ratio = getImageRatio({enlargedWidth: 6000, enlargedHeight: 4000}, {min: 1, max: 3});
        expect(ratio).toBe(1.5);
    });

    it('should get svg', () => {
        const svg = getNextIcon(document);
        expect(svg.outerHTML).toBe(
            '<svg viewBox="0 0 100 100"><polygon points="88.126,24.216 50.036,62.306 11.947,24.216 0.355,35.809 50.036,85.49 99.718,35.809"></polygon></svg>',
        );
    });

    it('should get svg with Angular SSR', () => {
        const window = domino.createWindow('<h1>Hello world</h1>', 'http://example.com');
        const document = window.document;

        const svg = getNextIcon(document);
        expect(svg.outerHTML).toBe(
            '<svg viewBox="0 0 100 100"><polygon points="88.126,24.216 50.036,62.306 11.947,24.216 0.355,35.809 50.036,85.49 99.718,35.809"></polygon></svg>',
        );
    });
});

describe('sanitizeHtml', () => {
    it('should not touch plain text and <br>', () => {
        expect(sanitizeHtml('')).toBe('');
        expect(sanitizeHtml(' ')).toBe(' ');
        expect(sanitizeHtml('foo')).toBe('foo');
        expect(sanitizeHtml('one > two > three')).toBe('one > two > three');
        expect(sanitizeHtml('foo <br/>bar')).toBe('foo <br/>bar');
        expect(sanitizeHtml('foo <br />bar')).toBe('foo <br />bar');
        expect(sanitizeHtml('foo <br>bar')).toBe('foo <br>bar');
        expect(sanitizeHtml('foo <BR>bar')).toBe('foo <BR>bar');
        expect(sanitizeHtml('foo <br >bar')).toBe('foo <br >bar');
    });

    it('should remove most HTML tag', () => {
        expect(sanitizeHtml('<strong>')).toBe('');
        expect(sanitizeHtml('<strong></strong>')).toBe('');
        expect(sanitizeHtml('foo <strong>bar</strong> baz')).toBe('foo bar baz');
        expect(sanitizeHtml('foo <unknown-tag>bar</unknown-tag> baz')).toBe('foo bar baz');
        expect(sanitizeHtml('foo <unknown-tag attr="val">bar</unknown-tag> baz')).toBe('foo bar baz');
        expect(sanitizeHtml('foo <unknown-tag \n attr="val">bar</unknown-tag> baz')).toBe('foo bar baz');
        expect(sanitizeHtml('foo \n<unknown-tag \nattr="val">bar\n</unknown-tag> \nbaz')).toBe('foo \nbar\n \nbaz');
        expect(sanitizeHtml('<STRONG>foo<STRONG> <strong>bar</strong> <em>baz</em>')).toBe('foo bar baz');
        expect(sanitizeHtml('<strong>one</strong> > two > three')).toBe('one > two > three');
        expect(sanitizeHtml('<scrip<script>is removed</script>t>alert(123)</script>')).toBe('is removedt>alert(123)'); // Broken but safe
        // HTML
        expect(sanitizeHtml('<!<!--- comment --->>')).toBe('>'); // Broken but safe HTML
        expect(sanitizeHtml('a<>b')).toBe('ab');
        expect(sanitizeHtml('a</>b')).toBe('ab');
        expect(sanitizeHtml('a<>b</>c')).toBe('abc');
        expect(
            sanitizeHtml(`<div
        >foo</
        div>`),
        ).toBe('foo');
    });

    it('sanitizeHtml should handle undefined and null', () => {
        expect(sanitizeHtml(undefined)).toBe('');
        // @ts-expect-error: Testing sanitizeHtml with null input
        expect(sanitizeHtml(null)).toBe('');
    });

    it('sanitizeHtml should keep <br> but remove other tags', () => {
        expect(sanitizeHtml('foo<br>bar')).toBe('foo<br>bar');
        expect(sanitizeHtml('foo<br/>bar')).toBe('foo<br/>bar');
        expect(sanitizeHtml('foo<strong>bar</strong>baz')).toBe('foobarbaz');
    });

    it('should remove a tag left unterminated at the end', () => {
        // Without a closing ">" these match no complete-tag rule, yet an HTML parser still acts on
        // them, so they must not be allowed to survive.
        expect(sanitizeHtml('<img src=x onerror="alert(1)" alt="a sunset')).toBe('');
        expect(sanitizeHtml('<script')).toBe('');
        expect(sanitizeHtml('foo <div')).toBe('foo ');
        expect(sanitizeHtml('a <b')).toBe('a ');
        expect(sanitizeHtml('foo <strong>bar</strong> baz <em')).toBe('foo bar baz ');
        // An unterminated "<br" is not a usable line break either
        expect(sanitizeHtml('foo <br')).toBe('foo ');
    });

    it('should keep a complete trailing <br>', () => {
        expect(sanitizeHtml('foo<br>')).toBe('foo<br>');
        expect(sanitizeHtml('foo<br/>')).toBe('foo<br/>');
        expect(sanitizeHtml('foo <br />')).toBe('foo <br />');
    });

    it('should keep a "<" used as plain text', () => {
        // Only a tag-like "<" is stripped, so ordinary prose keeps its text.
        expect(sanitizeHtml('a < b')).toBe('a < b');
        expect(sanitizeHtml('5 < 10')).toBe('5 < 10');
        expect(sanitizeHtml('one > two > three')).toBe('one > two > three');
        expect(sanitizeHtml('a <')).toBe('a <');
    });
});

describe('sanitizeToPlainText', () => {
    it('should sanitize like sanitizeHtml, then flatten <br>', () => {
        expect(sanitizeToPlainText(undefined)).toBe('');
        // @ts-expect-error: Testing sanitizeToPlainText with null input
        expect(sanitizeToPlainText(null)).toBe('');
        expect(sanitizeToPlainText('foo')).toBe('foo');
        expect(sanitizeToPlainText('one > two > three')).toBe('one > two > three');
        expect(sanitizeToPlainText('foo <strong>bar</strong> baz')).toBe('foo bar baz');
    });

    it('should replace <br> with a space, in every shape', () => {
        // `alt` and `aria-label` cannot hold markup: a leftover "<br>" is announced as text.
        expect(sanitizeToPlainText('foo<br>bar')).toBe('foo bar');
        expect(sanitizeToPlainText('foo<br/>bar')).toBe('foo bar');
        expect(sanitizeToPlainText('foo<br />bar')).toBe('foo bar');
        expect(sanitizeToPlainText('foo<BR>bar')).toBe('foo bar');
        expect(sanitizeToPlainText('foo<br >bar')).toBe('foo bar');
    });

    it('should leave other whitespace untouched', () => {
        expect(sanitizeToPlainText(' ')).toBe(' ');
        expect(sanitizeToPlainText('foo   bar')).toBe('foo   bar');
        expect(sanitizeToPlainText('foo \n<unknown-tag>bar\n</unknown-tag> \nbaz')).toBe('foo \nbar\n \nbaz');
    });
});

describe('renderSanitizedHtml', () => {
    /**
     * Renders `term` into a fresh element and returns it.
     */
    function render(term: string | undefined, doc: Document = document): HTMLElement {
        const target = doc.createElement('figcaption');
        renderSanitizedHtml(target, term);

        return target;
    }

    it('should produce the same text as sanitizeHtml', () => {
        // The exact inputs asserted for sanitizeHtml, to show the DOM path did not change what a
        // caption ends up displaying.
        const terms = [
            '',
            ' ',
            'foo',
            'one > two > three',
            '<strong>',
            '<strong></strong>',
            'foo <strong>bar</strong> baz',
            'foo <unknown-tag>bar</unknown-tag> baz',
            'foo <unknown-tag attr="val">bar</unknown-tag> baz',
            'foo \n<unknown-tag \nattr="val">bar\n</unknown-tag> \nbaz',
            '<STRONG>foo<STRONG> <strong>bar</strong> <em>baz</em>',
            '<strong>one</strong> > two > three',
            '<scrip<script>is removed</script>t>alert(123)</script>',
            '<!<!--- comment --->>',
            'a<>b',
            'a</>b',
            'a<>b</>c',
        ];

        terms.forEach(term => {
            expect(render(term).textContent).toBe(sanitizeHtml(term));
        });
    });

    it('should keep <br> as a real element', () => {
        expect(render('foo<br>bar').innerHTML).toBe('foo<br>bar');
        expect(render('foo<br/>bar').innerHTML).toBe('foo<br>bar');
        expect(render('foo <br />bar').innerHTML).toBe('foo <br>bar');
        expect(render('foo<BR>bar').innerHTML).toBe('foo<br>bar');
        expect(render('foo<br >bar').innerHTML).toBe('foo<br>bar');
        expect(render('a<br>b<br>c').querySelectorAll('br').length).toBe(2);
    });

    it('should build no element other than <br>', () => {
        expect(render('foo <strong>bar</strong> baz').querySelectorAll('*').length).toBe(0);
        expect(render('<em>x</em>').querySelectorAll('*').length).toBe(0);
        expect(render('foo<br><strong>bar</strong>').querySelectorAll('strong').length).toBe(0);
    });

    it('should not build an element from a tag the sanitizer misses', () => {
        // `>` inside an attribute value ends the match early, so a fragment of the tag survives
        // stripping. Assigned to innerHTML it could become a live element; here it stays text.
        const term = '<img alt="a > b" src=x onerror="alert(1)">';
        expect(sanitizeHtml(term)).not.toBe(''); // The sanitizer really does leave a remnant

        const target = render(term);
        expect(target.querySelector('img')).toBeNull();
        expect(target.querySelectorAll('*').length).toBe(0);
    });

    it('should clear previous content', () => {
        const target = document.createElement('figcaption');
        target.textContent = 'stale';

        renderSanitizedHtml(target, 'fresh');
        expect(target.textContent).toBe('fresh');

        renderSanitizedHtml(target, undefined);
        expect(target.textContent).toBe('');
        expect(target.childNodes.length).toBe(0);
    });

    it('should stay correct across calls despite the shared global regex', () => {
        // A global regex keeps `lastIndex`, so a stale one would make later calls miss breaks.
        for (let i = 0; i < 3; i++) {
            expect(render('a<br>b<br>c').querySelectorAll('br').length).toBe(2);
        }
    });

    it('should work with an SSR document', () => {
        const window = domino.createWindow('<h1>Hello world</h1>', 'http://example.com');
        const target = render('first<br><strong>second</strong>', window.document);

        expect(target.querySelectorAll('br').length).toBe(1);
        expect(target.textContent).toBe('firstsecond');
    });
});

describe('getImageRatioAndIfCropped', () => {
    it('should return correct ratio and cropped=false when no ratioLimits', () => {
        const result = getImageRatioAndIfCropped({enlargedWidth: 400, enlargedHeight: 200});
        expect(result).toEqual({ratio: 2, cropped: false});
    });

    it('should return correct ratio and cropped=false when within limits', () => {
        const result = getImageRatioAndIfCropped({enlargedWidth: 400, enlargedHeight: 200}, {min: 1, max: 3});
        expect(result).toEqual({ratio: 2, cropped: false});
    });

    it('should crop to min if ratio is too low', () => {
        const result = getImageRatioAndIfCropped({enlargedWidth: 100, enlargedHeight: 200}, {min: 1});
        expect(result).toEqual({ratio: 1, cropped: true});
    });

    it('should crop to max if ratio is too high', () => {
        const result = getImageRatioAndIfCropped({enlargedWidth: 400, enlargedHeight: 100}, {max: 2});
        expect(result).toEqual({ratio: 2, cropped: true});
    });
});
