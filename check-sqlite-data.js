const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'data', 'flower-kb.db'));

const tables = [
    'families', 'genera', 'plants', 'care_guides', 'tags', 'plant_tags',
    'llm_configs', 'llm_prompts', 'users', 'conversations', 'messages'
];

console.log('--- SQLite Data Counts ---');
for (const table of tables) {
    try {
        const stmt = db.prepare(`SELECT count(*) as count FROM ${table}`);
        const result = stmt.get();
        console.log(`${table}: ${result.count}`);
    } catch (e) {
        console.log(`${table}: [Error - maybe not exists] ${e.message}`);
    }
}
