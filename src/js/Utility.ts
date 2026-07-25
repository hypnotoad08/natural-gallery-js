import {SizedModel} from './galleries/AbstractGallery';

interface ImageRatioInfo {
    ratio: number;
    cropped: boolean;
}

export interface RatioLimits {
    min?: number;
    max?: number;
}

export function getNextIcon(document: Document): SVGSVGElement {
    // Here we cannot use `SVGSVGElement.innerHTML`, because it is not available in SSR.
    // So instead we use `HTMLDivElement.innerHTML`, and get the SVG inside that div.
    // see: https://github.com/fgnass/domino/blob/12a5f67136a0ac10e3fa1649b8787ba3b309e9a7/lib/Element.js#L95
    const div = document.createElement('div');
    div.innerHTML =
        '<svg viewBox="0 0 100 100"><polygon points="88.126,24.216 50.036,62.306 11.947,24.216 0.355,35.809 50.036,85.49 99.718,35.809"></polygon></svg>';

    return div.querySelector('svg')!;
}

export function getImageRatio(model: SizedModel, ratioLimits?: RatioLimits): number {
    let ratio = Number(model.enlargedWidth) / Number(model.enlargedHeight);

    if (ratioLimits) {
        if (ratioLimits.min && ratio < ratioLimits.min) {
            ratio = ratioLimits.min;
        } else if (ratioLimits.max && ratio > ratioLimits.max) {
            ratio = ratioLimits.max;
        }
    }

    return ratio;
}

export function getImageRatioAndIfCropped(model: SizedModel, ratioLimits?: RatioLimits): ImageRatioInfo {
    let ratio = Number(model.enlargedWidth) / Number(model.enlargedHeight);
    let cropped = false;

    if (ratioLimits) {
        if (ratioLimits.min && ratio < ratioLimits.min) {
            ratio = ratioLimits.min;
            cropped = true;
        } else if (ratioLimits.max && ratio > ratioLimits.max) {
            ratio = ratioLimits.max;
            cropped = true;
        }
    }

    return {ratio: ratio, cropped: cropped};
}

/**
 * Cleans HTML, and returns only the plain text and `<br>` from all eventual tags
 */
export function sanitizeHtml(term: string | undefined): string {
    if (!term) {
        return '';
    }

    return (
        term
            // Complete tags, `<br>` excepted
            .replace(/<(?!\s*br\s*\/?)[^>]*>/gi, '')
            // A tag left unterminated at the end of the input. It has no `>` for the rule above to
            // match on, so it would survive as-is, and an HTML parser would still act on it:
            // `<img src=x onerror=...` with no `>` builds a real image and fires its handler.
            //
            // Requires a tag-like character after the `<`, so that a `<` used as plain text is
            // left alone: "5 < 10" must not lose its "10".
            .replace(/<[a-z!/?][^>]*$/i, '')
    );
}

/**
 * Matches the `<br>` tags that `sanitizeHtml()` leaves behind (`<br>`, `<br/>`, `<br />`, and any
 * casing).
 */
const lineBreak = /<\s*br\s*\/?\s*>/gi;

/**
 * Returns sanitized text with its `<br>` flattened to spaces, for contexts that cannot hold markup
 * at all, such as `alt` and `aria-label`, where a leftover `<br>` would be announced literally as
 * "br" by a screen reader.
 */
export function sanitizeToPlainText(term: string | undefined): string {
    lineBreak.lastIndex = 0;

    return sanitizeHtml(term).replace(lineBreak, ' ');
}

/**
 * Displays `term` inside `target`, keeping `<br>` as a real line break and everything else as text.
 *
 * Use this instead of assigning `sanitizeHtml()`'s result to `innerHTML`. It produces the same
 * output for well-formed input, but builds the nodes itself rather than handing a string back to
 * the HTML parser, so a tag that slips through the sanitizer's regex — an unclosed `<img src=x
 * onerror=...` with no `>`, for instance — becomes inert text instead of a live element.
 */
export function renderSanitizedHtml(target: HTMLElement, term: string | undefined): void {
    target.textContent = '';

    const sanitized = sanitizeHtml(term);
    if (!sanitized) {
        return;
    }

    // `lineBreak` is global, so reset it: a shared regex keeps `lastIndex` between calls.
    lineBreak.lastIndex = 0;
    sanitized.split(lineBreak).forEach((part, index) => {
        if (index > 0) {
            target.appendChild(target.ownerDocument.createElement('br'));
        }

        if (part) {
            target.appendChild(target.ownerDocument.createTextNode(part));
        }
    });
}
