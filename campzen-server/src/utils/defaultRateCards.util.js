const RateCard = require('../models/rateCard.model');
const FinishingRate = require('../models/finishingRate.model');

// Standard Campus Print Rate Cards (Base Tier: 1 - 99999 pages)
const DEFAULT_RATE_CARDS_TEMPLATE = [
    // A4 - 70gsm (Standard Campus Workhorse)
    { paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 2.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '70gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 1.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '70gsm', colorMode: 'Color', sides: 'single', pricePerPage: 10.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '70gsm', colorMode: 'Color', sides: 'double', pricePerPage: 9.0, minPages: 1, maxPages: 99999, isActive: true },

    // A4 - 80gsm (Executive / Thesis)
    { paperSize: 'A4', paperType: '80gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 2.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '80gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 2.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '80gsm', colorMode: 'Color', sides: 'single', pricePerPage: 10.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '80gsm', colorMode: 'Color', sides: 'double', pricePerPage: 9.5, minPages: 1, maxPages: 99999, isActive: true },

    // A4 - 100gsm (Certificate / Heavy)
    { paperSize: 'A4', paperType: '100gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 3.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '100gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 3.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '100gsm', colorMode: 'Color', sides: 'single', pricePerPage: 11.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A4', paperType: '100gsm', colorMode: 'Color', sides: 'double', pricePerPage: 10.5, minPages: 1, maxPages: 99999, isActive: true },

    // Legal
    { paperSize: 'Legal', paperType: '70gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 3.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '70gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 2.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '70gsm', colorMode: 'Color', sides: 'single', pricePerPage: 12.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '70gsm', colorMode: 'Color', sides: 'double', pricePerPage: 11.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '80gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 3.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '80gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 3.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '80gsm', colorMode: 'Color', sides: 'single', pricePerPage: 12.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '80gsm', colorMode: 'Color', sides: 'double', pricePerPage: 11.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '100gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 4.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '100gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 4.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '100gsm', colorMode: 'Color', sides: 'single', pricePerPage: 13.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'Legal', paperType: '100gsm', colorMode: 'Color', sides: 'double', pricePerPage: 12.5, minPages: 1, maxPages: 99999, isActive: true },

    // A3
    { paperSize: 'A3', paperType: '70gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 5.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '70gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 4.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '70gsm', colorMode: 'Color', sides: 'single', pricePerPage: 20.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '70gsm', colorMode: 'Color', sides: 'double', pricePerPage: 18.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '80gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 5.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '80gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 5.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '80gsm', colorMode: 'Color', sides: 'single', pricePerPage: 21.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '80gsm', colorMode: 'Color', sides: 'double', pricePerPage: 19.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '100gsm', colorMode: 'B&W', sides: 'single', pricePerPage: 6.5, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '100gsm', colorMode: 'B&W', sides: 'double', pricePerPage: 6.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '100gsm', colorMode: 'Color', sides: 'single', pricePerPage: 22.0, minPages: 1, maxPages: 99999, isActive: true },
    { paperSize: 'A3', paperType: '100gsm', colorMode: 'Color', sides: 'double', pricePerPage: 20.0, minPages: 1, maxPages: 99999, isActive: true }
];

const DEFAULT_FINISHING_RATES_TEMPLATE = [
    { finishingType: 'spiral_binding', price: 25.0, isActive: true },
    { finishingType: 'comb_binding', price: 25.0, isActive: true },
    { finishingType: 'hardbound', price: 60.0, isActive: true },
    { finishingType: 'stapling', price: 5.0, isActive: true },
    { finishingType: 'lamination', price: 15.0, isActive: true }
];

/**
 * Seeds default rate cards and finishing rates for a vendor if not already present.
 */
async function seedDefaultRatesForVendor(vendorId) {
    if (!vendorId) return;

    try {
        const existingRatesCount = await RateCard.countDocuments({ vendorId });
        if (existingRatesCount === 0) {
            const cardsToInsert = DEFAULT_RATE_CARDS_TEMPLATE.map(card => ({
                ...card,
                vendorId
            }));
            await RateCard.insertMany(cardsToInsert, { ordered: false }).catch(() => {});
            console.log(`[RateCard] Initialized ${cardsToInsert.length} default rate cards for vendor ${vendorId}`);
        }

        const existingFinishingCount = await FinishingRate.countDocuments({ vendorId });
        if (existingFinishingCount === 0) {
            const finishingToInsert = DEFAULT_FINISHING_RATES_TEMPLATE.map(fr => ({
                ...fr,
                vendorId
            }));
            await FinishingRate.insertMany(finishingToInsert, { ordered: false }).catch(() => {});
            console.log(`[FinishingRate] Initialized default finishing rates for vendor ${vendorId}`);
        }
    } catch (err) {
        console.warn(`[DefaultRates] Warning seeding rates for vendor ${vendorId}:`, err.message);
    }
}

/**
 * Returns available active rate cards for a vendor, ensuring default fallback rates exist.
 * Deactivated rate cards (isActive: false) are strictly excluded from quotes.
 */
async function getEffectiveRateCards(vendorId) {
    let allVendorCards = await RateCard.find({ vendorId });
    if (allVendorCards.length === 0) {
        await seedDefaultRatesForVendor(vendorId);
        allVendorCards = await RateCard.find({ vendorId });
    }

    // Filter out inactive rate cards
    const activeCards = allVendorCards.filter(c => c.isActive !== false);

    // Merge any missing standard configurations from DEFAULT_RATE_CARDS_TEMPLATE,
    // BUT only if the vendor has NOT explicitly defined that configuration (active or inactive)
    const effective = [...activeCards];
    for (const tpl of DEFAULT_RATE_CARDS_TEMPLATE) {
        const hasExisting = allVendorCards.some(c =>
            c.paperSize === tpl.paperSize &&
            c.paperType === tpl.paperType &&
            c.colorMode === tpl.colorMode &&
            c.sides === tpl.sides
        );
        if (!hasExisting) {
            effective.push({ ...tpl, vendorId });
        }
    }
    return effective;
}

/**
 * Returns available active finishing rates for a vendor, ensuring fallback finishing rates exist.
 * Deactivated finishing rates (isActive: false) are strictly excluded from quotes.
 */
async function getEffectiveFinishingRates(vendorId) {
    let allRates = await FinishingRate.find({ vendorId });
    if (allRates.length === 0) {
        await seedDefaultRatesForVendor(vendorId);
        allRates = await FinishingRate.find({ vendorId });
    }

    const activeRates = allRates.filter(r => r.isActive !== false);

    const effective = [...activeRates];
    for (const tpl of DEFAULT_FINISHING_RATES_TEMPLATE) {
        const hasExisting = allRates.some(r => r.finishingType === tpl.finishingType);
        if (!hasExisting) {
            effective.push({ ...tpl, vendorId });
        }
    }
    return effective;
}

module.exports = {
    DEFAULT_RATE_CARDS_TEMPLATE,
    DEFAULT_FINISHING_RATES_TEMPLATE,
    seedDefaultRatesForVendor,
    getEffectiveRateCards,
    getEffectiveFinishingRates
};
