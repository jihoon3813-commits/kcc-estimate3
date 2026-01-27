
const XLSX = require('xlsx');

function analyzeExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });

    // Step 1: Customer Info
    let customerName = "";
    let address = "";
    for (let i = 0; i < 20; i++) {
        const row = data[i] || [];
        const rowStr = row.join(" ");
        if (rowStr.includes("공급받는자")) {
            customerName = String(row[2] || "").replace("님", "").split("(")[0].trim();
        }
        if (rowStr.includes("현장주소")) {
            address = String(row[2] || "").trim();
        }
    }

    // Step 2: Items
    let startRow = 0;
    for (let i = 0; i < 50; i++) {
        const row = data[i] || [];
        if (String(row[0]).includes("순번") && String(row[1]).includes("설치위치")) {
            startRow = i + 2; // Header is 2 rows (11, 12 in 0-indexed is 12, 13 in 1-indexed)
            break;
        }
    }

    const items = [];
    let totalMaterial = 0;
    let totalEtc = 0;

    for (let i = startRow; i < data.length; i += 3) {
        const row1 = data[i];
        const row2 = data[i + 1] || [];

        const loc = String(row1[1] || "").trim();
        if (!loc || loc === "비고" || loc === "nan") continue;

        // Structure from debug:
        // [1] loc, [2] prod, [3] model, [4] shape, [5] W, [7] H, [9] Inner Wrap, [10] Inner Thickness, [11] Inner GlassType, [12] Qty, [13] Handle... [18] Price
        // Row 2: [10] Outer Thickness, [11] Outer GlassType

        const prod = String(row1[2] || "").trim();
        const model = String(row1[3] || "").trim();
        const size = `${row1[5]}x${row1[7]}`;
        const thickIn = String(row1[10] || "").trim();
        const thickOut = String(row2[10] || "").trim();
        const glassIn = String(row1[11] || "").trim();
        const glassOut = String(row2[11] || "").trim();
        const priceRaw = parseFloat(String(row1[18] || "0").replace(/,/g, ""));

        const priceWithVat = Math.floor((priceRaw * 1.1) / 100) * 100;

        const isEtc = loc.includes("기타");
        const specLabel = isEtc ? "구분" : "모델명";
        const specValue = model;

        if (isEtc) {
            totalEtc += priceWithVat;
        } else {
            totalMaterial += priceWithVat;
        }

        items.push({
            no: items.length + 1,
            loc: loc,
            prod: prod,
            size: size,
            specLabel: specLabel,
            spec: specValue,
            thickIn: thickIn,
            thickOut: (glassOut && glassOut !== " ") ? thickOut : "",
            glassIn: glassIn,
            glassOut: (glassOut && glassOut !== " ") ? glassOut : "",
            price: priceWithVat,
            isEtc: isEtc
        });
    }

    const result = {
        customerName,
        address,
        items,
        totalMaterial,
        totalEtc,
        totalSum: totalMaterial + totalEtc
    };

    console.log(JSON.stringify(result, null, 2));
}

analyzeExcel("김기홍4_01063423880_260116_7.xlsx");
