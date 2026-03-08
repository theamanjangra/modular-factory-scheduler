const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// 1. Add @default(now()) to updatedAt if missing (already done, but safe to keep)
schema = schema.replace(/updatedAt\s+DateTime\s+@updatedAt(?!\s+@default)/g, 'updatedAt DateTime @default(now()) @updatedAt');

// 2. Fix _underscore mappings
// Replace @@map("_something") with @@map("something") if it exists
schema = schema.replace(/@@map\("_([a-z0-9_]+)"\)/g, '@@map("$1")');

// 3. Ensure Enums are mapped if not
// (Previous script logic to add them if missing, but let's just rely on fixing the existing incorrect ones first)
// If I missed some, I'll loop again.
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
        // Closing brace.
        // Check if previous line was @@map
        const prevLine = newLines[newLines.length - 1];
        if (!prevLine.includes('@@map')) {
            const snakeName = toSnakeCase(currentEnumName);
            // Remove leading underscore if my previous logic put it there? 
            // toSnakeCase("TaskType") -> "_task_type" because of the first capital T?
            // Ah! toSnakeCase replaces ALL caps. "_task_type".
            // Correct logic: "TaskType" -> "task_type".
            let correctSnakeName = snakeName;
            if (correctSnakeName.startsWith('_')) correctSnakeName = correctSnakeName.substring(1);

            newLines.push(`  @@map("${correctSnakeName}")`);
        }
        insideEnum = false;
        newLines.push(line);
        continue;
    }

    newLines.push(line);
}

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Fixed Enums (removed leading underscore).');
