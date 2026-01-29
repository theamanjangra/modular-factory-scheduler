
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
const NUM_BOXES = 10;
const OUTPUT_FILE = path.join(__dirname, '../data/10_box_simulation.json');

// Drivers and Ratios (Invented based on "Modular Construction" standards + The 2 examples)
// Format: output_hours = attribute_value / ratio
const LABOR_DRIVERS = [
    { name: "Length", min: 40, max: 70, ratio: 7.12 },      // Example from Sheet
    { name: "Width", min: 12, max: 15, ratio: 4.0 },        // Assume width adds complexity
    { name: "Roof SqFt", min: 500, max: 1000, ratio: 28.57 }, // Example from Sheet
    { name: "Windows", min: 4, max: 12, ratio: 0.5 },       // 1 window = 2 hours? (Ratio 0.5 -> 2h) Wait. ratio = attr / hours. So 0.5 ratio means 1 wdw / 0.5 = 2 hours. Correct.
    { name: "Doors", min: 1, max: 3, ratio: 1.0 },          // 1 door = 1 hour
    { name: "Plumbing Fixtures", min: 2, max: 5, ratio: 0.3 }, // 1 fixture = 3.3 hours
    { name: "Electrical Drops", min: 10, max: 30, ratio: 5.0 } // 1 drop = 0.2 hours
];

// Shift Capacity
const WORKERS = 16;
const SHIFT_HOURS = 10;
const SHIFT_CAPACITY_HOURS = WORKERS * SHIFT_HOURS; // 160 Man-Hours

// ---------------------------------------------------------
// GENERATOR
// ---------------------------------------------------------

interface BoxData {
    serial: string;
    attributes: Record<string, number>;
    totalLaborHours: number;
    productionRate: number; // Boxes per Shift
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateBox(index: number): BoxData {
    const attributes: Record<string, number> = {};
    let totalLaborHours = 0;

    // 1. Generate Attributes & Calculate Time
    LABOR_DRIVERS.forEach(driver => {
        let val = randomInt(driver.min, driver.max);

        // Correlations
        if (driver.name === "Roof SqFt") {
            // Rough Calc: Length * Width * 1.1 (pitch)
            const L = attributes["Length"] || 50;
            const W = attributes["Width"] || 14;
            val = Math.floor(L * W * 1.1);
        }

        attributes[driver.name] = val;

        const hours = val / driver.ratio;
        totalLaborHours += hours;
    });

    // 2. Add fixed baseline?
    // Assume 20% fixed overhead
    totalLaborHours = totalLaborHours * 1.2;

    // 3. Calculate Rate
    // Rate = Capacity / Required
    const rate = SHIFT_CAPACITY_HOURS / totalLaborHours;

    return {
        serial: `BOX-${2500 + index}`,
        attributes,
        totalLaborHours: parseFloat(totalLaborHours.toFixed(1)),
        productionRate: parseFloat(rate.toFixed(2))
    };
}

function main() {
    console.log(`Generating ${NUM_BOXES} Boxes...`);
    const boxes: BoxData[] = [];

    for (let i = 0; i < NUM_BOXES; i++) {
        boxes.push(generateBox(i));
    }

    // Output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(boxes, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);

    // Preview
    console.table(boxes.map(b => ({
        Serial: b.serial,
        "Length": b.attributes["Length"],
        "Hours": b.totalLaborHours,
        "Rate": b.productionRate
    })));
}

main();
