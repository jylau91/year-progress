const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });

  try {
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);

    const currentYear = Number(new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Singapore',
      year: 'numeric'
    }).format(new Date()));

    const panels = await page.locator('.year-panel').evaluateAll(nodes => nodes.map(node => ({
      year: Number(node.dataset.year),
      left: node.getBoundingClientRect().left,
      top: node.getBoundingClientRect().top
    })));

    assert.equal(panels.length, 2, 'renders exactly two year panels');
    assert.deepEqual(panels.map(panel => panel.year), [currentYear, currentYear + 1]);
    assert.ok(panels[1].left > panels[0].left, 'next year is positioned to the right');
    assert.ok(Math.abs(panels[1].top - panels[0].top) < 2, 'year panels share one horizontal row');

    const events = await page.locator('.day.event').evaluateAll(nodes => nodes.map(node => ({
      date: node.dataset.date,
      name: node.dataset.event,
      title: node.title,
      background: getComputedStyle(node).backgroundColor
    })));

    assert.deepEqual(events.map(event => [event.date, event.name]), [
      ['2026-11-08', 'TDF SG Criterium'],
      ['2027-04-10', 'T100 SG Sprint'],
      ['2027-07-25', 'Ironman 70.3 Desaru']
    ]);
    assert.ok(events.every(event => event.title.includes(event.name)), 'event tooltips contain event names');
    assert.equal(new Set(events.map(event => event.background)).size, 1, 'all sporting events use one special colour');
    assert.notEqual(events[0].background, 'rgb(255, 71, 87)', 'sporting-event orange differs from today red');

    const legend = page.locator('.event-legend');
    await assert.doesNotReject(() => legend.waitFor({ state: 'visible' }));
    assert.match(await legend.textContent(), /Sporting event/i);

    console.log('year-progress browser tests passed');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
