
import axios from 'axios';

async function main() {
    console.log("Triggering Simulation to verify DB Plan usage...");
    try {
        const response = await axios.post('http://localhost:3000/api/v1/schedule/simulate');
        console.log("Simulation Response Status:", response.status);
        console.log("Shifts in Response:", response.data.shifts?.length || 0);

        if (response.data.shifts && response.data.shifts.length > 0) {
            console.log("Shift 1 Details:", JSON.stringify(response.data.shifts[0], null, 2));
            console.log("Shift 2 Details:", JSON.stringify(response.data.shifts[1], null, 2));
        }
    } catch (error: any) {
        console.error("Simulation Failed:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

main();
