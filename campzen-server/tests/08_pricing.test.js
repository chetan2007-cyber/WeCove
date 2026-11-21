const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculatePageCount, calculatePrice } = require('../src/services/pricing.service');

const mockRateCards = [
    { paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'single', minPages: 1, maxPages: 50, pricePerPage: 2.00 },
    { paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'single', minPages: 51, maxPages: 100, pricePerPage: 1.50 },
    { paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'single', minPages: 101, maxPages: 99999, pricePerPage: 1.00 },
    { paperSize: 'A4', paperType: '70gsm', colorMode: 'Color', sides: 'single', minPages: 1, maxPages: 99999, pricePerPage: 10.00 }
];

const mockFinishingRates = [
    { finishingType: 'spiral_binding', price: 30.00 },
    { finishingType: 'lamination', price: 15.00 }
];

test('calculatePageCount - Correctly calculates "all" and comma/hyphen ranges', () => {
    assert.equal(calculatePageCount('all', 50), 50);
    assert.equal(calculatePageCount('1,3,5-7', 50), 5); // 1, 3, 5, 6, 7
    assert.equal(calculatePageCount('2-4', 50), 3); // 2, 3, 4
});

test('calculatePageCount - Rejects inverted range like "5-2"', () => {
    assert.throws(() => {
        calculatePageCount('5-2', 50);
    }, /invalid logical range/i);
});

test('calculatePageCount - Rejects page range exceeding total document pages', () => {
    assert.throws(() => {
        calculatePageCount('1-20', 10);
    }, /exceeds total document pages/i);
});

test('calculatePrice - Standard B&W order with volume tier boundaries', () => {
    // Exactly 50 pages -> tier 1 @ 2.00
    const res50 = calculatePrice({
        documentPageCount: 100,
        pageRange: 'all',
        copies: 1,
        colorMode: 'B&W',
        sides: 'single',
        paperSize: 'A4',
        paperType: '70gsm',
        pagesPerSheet: 2, // 100 / 2 = 50 billing units
        finishingOptions: [],
        availableRateCards: mockRateCards,
        availableFinishingRates: mockFinishingRates
    });
    assert.equal(res50.billingUnitsPerCopy, 50);
    assert.equal(res50.rateApplied, 2.00);
    assert.equal(res50.total, 100.00);

    // Exactly 51 pages -> tier 2 @ 1.50
    const res51 = calculatePrice({
        documentPageCount: 51,
        pageRange: 'all',
        copies: 1,
        colorMode: 'B&W',
        sides: 'single',
        paperSize: 'A4',
        paperType: '70gsm',
        pagesPerSheet: 1, // 51 billing units
        finishingOptions: [],
        availableRateCards: mockRateCards,
        availableFinishingRates: mockFinishingRates
    });
    assert.equal(res51.billingUnitsPerCopy, 51);
    assert.equal(res51.rateApplied, 1.50);
    assert.equal(res51.total, 76.50);
});

test('calculatePrice - Includes finishing rates per copy', () => {
    const res = calculatePrice({
        documentPageCount: 10,
        pageRange: 'all',
        copies: 3,
        colorMode: 'B&W',
        sides: 'single',
        paperSize: 'A4',
        paperType: '70gsm',
        pagesPerSheet: 1,
        finishingOptions: [{ type: 'spiral_binding' }, { type: 'lamination' }],
        availableRateCards: mockRateCards,
        availableFinishingRates: mockFinishingRates
    });
    assert.equal(res.printCost, 60.00);
    assert.equal(res.finishingCost, 135.00);
    assert.equal(res.total, 195.00);
});

test('calculatePrice - Throws error when no matching rate card is configured', () => {
    assert.throws(() => {
        calculatePrice({
            documentPageCount: 10,
            pageRange: 'all',
            copies: 1,
            colorMode: 'Color',
            sides: 'double',
            paperSize: 'A3',
            paperType: '70gsm',
            pagesPerSheet: 1,
            finishingOptions: [],
            availableRateCards: mockRateCards,
            availableFinishingRates: mockFinishingRates
        });
    }, /no applicable rate card/i);
});

test('calculatePrice - Throws error when requested finishing is not available at vendor', () => {
    assert.throws(() => {
        calculatePrice({
            documentPageCount: 10,
            pageRange: 'all',
            copies: 1,
            colorMode: 'B&W',
            sides: 'single',
            paperSize: 'A4',
            paperType: '70gsm',
            pagesPerSheet: 1,
            finishingOptions: [{ type: 'hardbound' }],
            availableRateCards: mockRateCards,
            availableFinishingRates: mockFinishingRates
        });
    }, /finishing rate for 'hardbound' not found/i);
});

test('calculatePrice - Mixed Color mode accurately bills B&W and Color pages', () => {
    const res = calculatePrice({
        documentPageCount: 10,
        pageRange: 'all',
        copies: 1,
        colorSelectionType: 'custom',
        colorPages: '2, 5',
        sides: 'single',
        paperSize: 'A4',
        paperType: '70gsm',
        pagesPerSheet: 1,
        finishingOptions: [],
        availableRateCards: mockRateCards,
        availableFinishingRates: mockFinishingRates
    });

    assert.equal(res.rawPagesSelected, 10);
    assert.equal(res.bwPagesCount, 8, 'Should have 8 B&W pages');
    assert.equal(res.colorPagesCount, 2, 'Should have 2 Color pages');
    // 8 B&W @ 2.00 = 16, 2 Color @ 10.00 = 20 -> Total 36.00
    assert.equal(res.printCost, 36.00);
    assert.equal(res.total, 36.00);
});

test('calculatePrice - Defaults to 100% B&W if no color pages requested', () => {
    const res = calculatePrice({
        documentPageCount: 15,
        pageRange: 'all',
        copies: 1,
        sides: 'single',
        paperSize: 'A4',
        paperType: '70gsm',
        pagesPerSheet: 1,
        finishingOptions: [],
        availableRateCards: mockRateCards,
        availableFinishingRates: mockFinishingRates
    });

    assert.equal(res.rawPagesSelected, 15);
    assert.equal(res.bwPagesCount, 15, 'All 15 pages should default to B&W');
    assert.equal(res.colorPagesCount, 0, 'Zero color pages by default');
    assert.equal(res.printCost, 30.00); // 15 * 2.00
});
