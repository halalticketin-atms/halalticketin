import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('embed checkout docs', () => {
    it('documents embed checkout usage', () => {
        const docPath = path.resolve(process.cwd(), '../docs/embed-checkout-widget.md');
        const doc = readFileSync(docPath, 'utf8');
        expect(doc).toContain('halal-ticketin-checkout');
    });
});
