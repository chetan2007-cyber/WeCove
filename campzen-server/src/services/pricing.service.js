/**
 * Parses a page range string like '1,3,5-7' and returns the total number of physical pages selected.
 */
const calculatePageCount = (pageRange, totalDocPages) => {
    if (!pageRange || pageRange === 'all') return totalDocPages || 0;

    let count = 0;
    const segments = pageRange.split(',');

    for (let segment of segments) {
        const trimmed = segment.trim();
        if (!trimmed) continue;

        if (trimmed.includes('-')) {
            const parts = trimmed.split('-').map(Number);
            if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                throw new Error(`Invalid page range segment: ${segment}`);
            }
            const [start, end] = parts;
            if (start < 1 || start > end) {
                throw new Error(`Invalid logical range in pageRange: ${start}-${end}`);
            }
            if (totalDocPages && end > totalDocPages) {
                throw new Error(`Page range ${end} exceeds total document pages (${totalDocPages})`);
            }
            count += (end - start + 1);
        } else {
            const pageNum = Number(trimmed);
            if (isNaN(pageNum) || pageNum < 1) {
                throw new Error(`Invalid page number: ${trimmed}`);
            }
            if (totalDocPages && pageNum > totalDocPages) {
                throw new Error(`Page number ${pageNum} exceeds total document pages (${totalDocPages})`);
            }
            count += 1;
        }
    }
    return count;
};

/**
 * Calculates the total print and finishing price.
 */
const calculatePrice = ({
    documentPageCount,
    pageRange,
    copies = 1,
    colorMode = 'B&W',
    colorSelectionType = 'none',
    colorPages = '',
    colorPageCount = 0,
    sides = 'single',
    paperSize = 'A4',
    paperType = '70gsm',
    pagesPerSheet = 1,
    finishingOptions = [],
    availableRateCards = [],
    availableFinishingRates = []
}) => {
    // 1. Calculate raw pages selected from the document
    const rawPages = calculatePageCount(pageRange, documentPageCount);

    // 2. Determine Color vs B&W pages distribution
    let isMixed = colorMode === 'Mixed' || colorSelectionType === 'custom' || (colorPageCount > 0 && colorPageCount < rawPages);
    let resolvedColorPages = 0;
    let resolvedBwPages = rawPages;

    if (isMixed) {
        if (colorPageCount > 0) {
            resolvedColorPages = Math.min(rawPages, colorPageCount);
        } else if (colorPages && colorPages.trim() !== '') {
            try {
                resolvedColorPages = Math.min(rawPages, calculatePageCount(colorPages, documentPageCount));
            } catch (_) {
                resolvedColorPages = 0;
            }
        }
        resolvedBwPages = Math.max(0, rawPages - resolvedColorPages);
    } else if (colorMode === 'Color' || colorSelectionType === 'all') {
        resolvedColorPages = rawPages;
        resolvedBwPages = 0;
    } else {
        // Default: everything is B&W
        resolvedColorPages = 0;
        resolvedBwPages = rawPages;
    }

    // 3. Adjust billing units for N-up printing
    const totalBillingUnits = Math.ceil(rawPages / pagesPerSheet);
    const colorBillingUnits = Math.ceil(resolvedColorPages / pagesPerSheet);
    const bwBillingUnits = Math.ceil(resolvedBwPages / pagesPerSheet);

    // 4. Rate lookup helper based on volume slab
    const findRate = (mode, units) => {
        return availableRateCards.find(card =>
            card.isActive !== false &&
            card.paperSize === paperSize &&
            card.paperType === paperType &&
            card.colorMode === mode &&
            card.sides === sides &&
            totalBillingUnits >= card.minPages &&
            totalBillingUnits <= card.maxPages
        );
    };

    let printCost = 0;
    let rateApplied = 0;
    let bwRate = null;
    let colorRate = null;

    if (resolvedColorPages > 0 && resolvedBwPages > 0) {
        bwRate = findRate('B&W', totalBillingUnits);
        colorRate = findRate('Color', totalBillingUnits);

        if (!bwRate || !colorRate) {
            throw new Error('No applicable rate card found for these settings and volume.');
        }

        const bwCost = bwBillingUnits * bwRate.pricePerPage * copies;
        const colorCost = colorBillingUnits * colorRate.pricePerPage * copies;
        printCost = bwCost + colorCost;
        rateApplied = Number(((bwCost + colorCost) / Math.max(1, totalBillingUnits * copies)).toFixed(2));
    } else if (resolvedColorPages > 0) {
        colorRate = findRate('Color', totalBillingUnits);
        if (!colorRate) {
            throw new Error('No applicable rate card found for these settings and volume.');
        }
        printCost = totalBillingUnits * colorRate.pricePerPage * copies;
        rateApplied = colorRate.pricePerPage;
    } else {
        bwRate = findRate('B&W', totalBillingUnits);
        if (!bwRate) {
            throw new Error('No applicable rate card found for these settings and volume.');
        }
        printCost = totalBillingUnits * bwRate.pricePerPage * copies;
        rateApplied = bwRate.pricePerPage;
    }

    // 5. Calculate Finishing Cost
    let finishingCost = 0;
    const itemizedFinishing = [];

    if (finishingOptions && finishingOptions.length > 0) {
        for (let option of finishingOptions) {
            if (option.type === 'none') continue;

            const rate = availableFinishingRates.find(r => r.finishingType === option.type && r.isActive !== false);
            if (!rate) {
                throw new Error(`Finishing rate for '${option.type}' not found at this shop.`);
            }

            const cost = rate.price * copies;
            finishingCost += cost;
            itemizedFinishing.push({ type: option.type, cost });
        }
    }

    return {
        rawPagesSelected: rawPages,
        bwPagesCount: resolvedBwPages,
        colorPagesCount: resolvedColorPages,
        billingUnitsPerCopy: totalBillingUnits,
        rateApplied,
        printCost: Number(printCost.toFixed(2)),
        finishingCost,
        itemizedFinishing,
        total: Number((printCost + finishingCost).toFixed(2))
    };
};

module.exports = { calculatePageCount, calculatePrice };