import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../assets/js/safe-render.js', import.meta.url), 'utf8');
const { escapeHtml, safeHttpUrl } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
globalThis.window = { location: { href: 'https://infinite-island.example/' } };

test('database and form text remains inert in HTML text and attributes', () => {
    assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    assert.equal(escapeHtml('" onload=alert(1) x="'), '&quot; onload=alert(1) x=&quot;');
    assert.equal(escapeHtml("A&B's"), 'A&amp;B&#39;s');
    assert.equal(escapeHtml(null), '');
});

test('external links and images accept only HTTP(S) URLs', () => {
    assert.equal(safeHttpUrl('https://example.com/player'), 'https://example.com/player');
    assert.equal(safeHttpUrl('/images/player.png'), 'https://infinite-island.example/images/player.png');
    assert.equal(safeHttpUrl('javascript:alert(1)'), '');
    assert.equal(safeHttpUrl('data:image/svg+xml,<svg onload=alert(1)>'), '');
    assert.equal(safeHttpUrl('file:///private'), '');
});

test('V1 pages no longer link to the removed inquiry page', async () => {
    const root = new URL('../', import.meta.url);
    const pages = (await readdir(root)).filter(name => name.endsWith('.html'));
    assert.ok(!pages.includes('inquiry.html'));
    for (const page of pages) {
        const html = await readFile(new URL(page, root), 'utf8');
        assert.doesNotMatch(html, /inquiry\.html|assets\/js\/inquiry\.js|assets\/css\/inquiry\.css/i, page);
    }
});
