
import * as XLSX from 'xlsx';

const masterFile = 'Vederra - Labor Optimization Master.xlsx';
const wb = XLSX.readFile(masterFile);
console.log('Sheet Names:', wb.SheetNames);
