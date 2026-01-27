
const XLSX = require('xlsx');
const workbook = XLSX.readFile("김기홍4_01063423880_260116_7.xlsx");
const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
console.log(data.slice(0, 30));
