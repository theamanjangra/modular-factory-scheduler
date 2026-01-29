
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

// Note: Ensure server is running on localhost:3000
const API_URL = 'http://localhost:8080/api/v1/worker-tasks/plan-file-export';
const EXCEL_PATH = path.join(__dirname, '../sample_simulation 2.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../test_output_verification.xlsx');

async function testExport() {
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`❌ File not found: ${EXCEL_PATH}`);
        process.exit(1);
    }

    console.log(`🚀 Testing Export API with: ${EXCEL_PATH}`);

    const form = new FormData();
    form.append('file', fs.createReadStream(EXCEL_PATH));
    form.append('startTime', '2024-01-01T08:00:00Z');
    form.append('endTime', '2024-01-01T17:00:00Z');

    try {
        const response = await axios.post(API_URL, form, {
            headers: {
                ...form.getHeaders()
            },
            responseType: 'arraybuffer'
        });

        console.log(`✅ Response Status: ${response.status}`);
        console.log(`✅ Content Type: ${response.headers['content-type']}`);

        fs.writeFileSync(OUTPUT_PATH, response.data);
        console.log(`✅ Saved Excel Report to: ${OUTPUT_PATH}`);

        // Basic Validation
        const stats = fs.statSync(OUTPUT_PATH);
        console.log(`✅ File Size: ${stats.size} bytes`);
        if (stats.size < 1000) {
            console.error("❌ File seems too small to be valid Excel.");
            process.exit(1);
        }

    } catch (error: any) {
        if (error.response) {
            console.error(`❌ API Error: ${error.response.status} - ${error.response.statusText}`);
            console.error(error.response.data.toString());
        } else {
            console.error(`❌ Network Error: ${error.message}`);
        }
        process.exit(1);
    }
}

testExport();
