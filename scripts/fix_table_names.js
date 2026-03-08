const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Regex to find @@map("name_s")
// We want to replace "users" -> "user", "tasks" -> "task"
// But ignore things that naturally end in s like "status" (though table names "status" are rare, usually "statuses").
// Check the list of dropped tables in the error log:
// department, module_attribute, module_profile, project, shift, station, task_template, time_study, traveler_template, worker.

// Just strip the trailing 's' from ALL @@map entries?
// Let's be slightly careful.

schema = schema.replace(/@@map\("([a-z0-9_]+)s"\)/g, (match, name) => {
    // Exceptions?
    if (name.endsWith('ss')) return match; // e.g. class?
    if (name === 'statu') return match; // status -> statu (bad)
    if (name === 'analysi') return match; // analysis

    // In this specific schema, most look like standard plurals.
    // users -> user
    // projects -> project
    // shifts -> shift

    return `@@map("${name}")`;
});

// Also fix specific known singulars that might not end in s (none? usually plural maps end in s).

fs.writeFileSync(schemaPath, schema);
console.log('Fixed table @@map to singular.');
