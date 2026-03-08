const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

const lines = schema.split('\n');
const newLines = lines.map(line => {
    // 1. Basic parsing
    // Match: indent + fieldName + space + type + optional rest
    // Regex matching ONLY valid identifier start chars.
    const match = line.match(/^(\s+)([a-z][a-zA-Z0-9]*)\s+([a-zA-Z0-9\?\[\]]+)(\s+.*)?$/);

    if (!match) return line;

    const [fullMatch, indent, fieldName, type, rest = ''] = match;
    const restTrimmed = rest.trim();

    // 2. Filter: Must be CamelCase
    if (!/[A-Z]/.test(fieldName)) return line;

    // 3. Filter: Skip if already has @map
    if (rest.includes('@map(')) return line;

    // 4. Filter: Skip @relation
    if (rest.includes('@relation')) return line;

    // 5. Filter: Skip Arrays
    if (type.includes('[]')) return line;

    // 6. Whitelist: Scalars Only
    const scalarTypes = ['String', 'Int', 'Boolean', 'Float', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt'];
    const cleanType = type.replace('?', '');

    let isTarget = scalarTypes.includes(cleanType);

    // 7. Heuristic: Map Enums if they end in standard suffixes or are known Enums
    // We want to be careful not to map Models.
    if (!isTarget) {
        const knownEnumSuffixes = ['Type', 'Status', 'Role', 'Reason', 'Directory', 'Skill', 'Priority', 'Category'];
        const isEnumHeuristic = knownEnumSuffixes.some(s => cleanType.endsWith(s)) || cleanType === 'Skill';
        if (isEnumHeuristic) isTarget = true;
    }

    // Special catch: if field ends in Id, map it regardless of type (usually String or Int)
    // Actually if it ends in Id, it's almost certainly a scalar FK.
    if (fieldName.endsWith('Id')) isTarget = true;

    if (!isTarget) return line;

    const snakeName = toSnakeCase(fieldName);
    if (snakeName === fieldName) return line;

    // Reconstruct line with @map
    // preserve original trailing whitespace? Usually 'rest' captures it if we aren't careful?
    // Regex `(\s+.*)?` captures spaces + chars.

    // If rest is empty/whitespace, just append.
    // Use trimming to ensure clean formatting.

    return `${indent}${fieldName.padEnd(Math.max(fieldName.length, 20))} ${type} ${restTrimmed} @map("${snakeName}")`.trimEnd();
    // Format: "  fieldName        Type attribute @map"
});

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Schema updated lines processing.');
