const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// 1. Add @default(now()) to updatedAt if missing
// Find: updatedAt DateTime @updatedAt (and NO @default)
schema = schema.replace(/updatedAt\s+DateTime\s+@updatedAt(?!\s+@default)/g, 'updatedAt DateTime @default(now()) @updatedAt');

// 2. Map Enums
// Regex to capture Enum Name and the block content? No, just injection at end?
// Or line-by-line?
// Enums start with `enum Name {`.
// We want to detect if it's PascalCase.
const lines = schema.split('\n');
const newLines = [];
let insideEnum = false;
let currentEnumName = '';

for (const line of lines) {
    const enumMatch = line.match(/^enum\s+([A-Z][a-zA-Z0-9]*)\s+\{/);
    if (enumMatch) {
        insideEnum = true;
        currentEnumName = enumMatch[1];
        newLines.push(line);
        continue;
    }

    if (insideEnum && line.trim() === '}') {
        // Closing brace. Add @@map if needed.
        const snakeName = toSnakeCase(currentEnumName);
        if (snakeName !== currentEnumName) {
            // Check if already mapped?
            // Assuming no @@map inside yet (standard schema).
            // But we can check lines added since enum start? No complex logic.
            // Just insert before closing brace? 
            // Better: Add it right before this line?
            // Or just format: `  @@map("snake_name")`
            newLines.push(`  @@map("${snakeName}")`);
        }
        insideEnum = false;
        newLines.push(line);
        continue;
    }

    newLines.push(line);
}

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Fixed Enums and Defaults.');
