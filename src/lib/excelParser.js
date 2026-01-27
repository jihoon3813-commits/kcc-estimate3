
import * as XLSX from 'xlsx';

export const parseExcelEstimate = async (file) => {
    // Extract info from filename (Format: Name_Phone_Date_Seq.xlsx)
    const fileName = file.name || "";
    const namePart = fileName.split(".")[0];
    const parts = namePart.split("_");
    const extractedName = parts.length > 0 ? parts[0].trim() : "";
    const extractedPhone = parts.length > 1 ? parts[1].replace(/[^0-9]/g, "") : "";

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                // Step 1: Customer Info
                let address = "";
                let sheetPhone = "";

                for (let i = 0; i < 20; i++) {
                    const row = rows[i] || [];
                    const rowStr = row.join(" ");

                    if (rowStr.includes("현장주소")) {
                        address = String(row[2] || "").trim();
                    }

                    // Scan for Phone Number
                    for (let j = 0; j < row.length; j++) {
                        const cell = String(row[j] || "").replace(/\s/g, "");
                        if (cell.includes("전화번호") || cell.includes("연락처") || cell.includes("H.P") || cell.includes("HP")) {
                            // Try Next Cell
                            let val = String(row[j + 1] || "").trim();
                            // If empty, try next next
                            if (!val) val = String(row[j + 2] || "").trim();

                            // Clean up
                            val = val.replace(/[^0-9-]/g, "");

                            if (val.length >= 9) { // Min length for a valid KR phone
                                sheetPhone = val;
                            }
                        }
                    }
                }

                // Step 2: Items
                let startRow = 0;
                for (let i = 0; i < 50; i++) {
                    const row = rows[i] || [];
                    if (String(row[0]).includes("순번") && String(row[1]).includes("설치위치")) {
                        startRow = i + 2;
                        break;
                    }
                }

                const items = [];
                let totalMaterial = 0;
                let totalEtc = 0;

                for (let i = startRow; i < rows.length; i += 3) {
                    const row1 = rows[i] || [];
                    const row2 = rows[i + 1] || [];

                    // C열(2) -> Index 1: 설치위치 (Shifted)
                    const loc = String(row1[1] || "").trim();
                    if (!loc || loc === "비고" || loc === "nan") continue;

                    // D열(3) -> Index 2: 제품명 (Shifted)
                    const prod = String(row1[2] || "").trim();

                    // E열(4) -> Index 3: 모델명 (Shifted)
                    const model = String(row1[3] || "").trim();

                    // F열(5) -> Index 4: 창형태 (Shifted)
                    const winType = String(row1[4] || "").trim();

                    // G~J열 -> Index 5, 7: 규격 (Shifted)
                    const width = String(row1[5] || "").trim();
                    const height = String(row1[7] || "").trim();
                    const size = (width || height) ? `${width}x${height}` : "";

                    // L열(11): 유리두께 (Full String e.g. "28T 투명+투명")
                    // M열(12): 유리종류
                    const rawThickIn = String(row1[11] || "").trim();
                    const typeIn = String(row1[12] || "").trim();

                    // Extract just the thickness (e.g. "28T", "24mm", "22")
                    // Matches start of string: digits followed optionally by T or mm
                    const thickMatchIn = rawThickIn.match(/^(\d+(?:T|mm)?)/i);
                    const thickIn = thickMatchIn ? thickMatchIn[1] : rawThickIn;

                    // User Request: Column M is quantity (typeIn), remove it from glass spec.
                    const glassIn = rawThickIn;

                    // 외부(2행)
                    const rawThickOut = String(row2[11] || "").trim();
                    const typeOut = String(row2[12] || "").trim();

                    const thickMatchOut = rawThickOut.match(/^(\d+(?:T|mm)?)/i);
                    const thickOut = thickMatchOut ? thickMatchOut[1] : (rawThickOut ? rawThickOut : "");

                    // User Request: Column M is quantity (typeOut), remove it from glass spec.
                    const glassOut = rawThickOut;

                    // O열(15번째 컬럼) -> Index 14 implies P if shifted. Check column?
                    // User says O has Text. Likely Index 13 due to shift.
                    const handle = String(row1[13] || "").trim();

                    // R열(18번째 컬럼) -> Index 17 implies S if shifted. Check column?
                    // User says R has Text. Likely Index 16 due to shift.
                    const screen = String(row1[16] || "").trim();

                    // S열(19번째 컬럼) -> Index 18: 금액
                    const priceRaw = parseFloat(String(row1[18] || "0").replace(/,/g, ""));
                    const priceWithVat = Math.round(priceRaw * 1.1);

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
                        model: model,
                        winType: winType,
                        size: size,
                        specLabel: specLabel,
                        spec: specValue,
                        // 유리 개별 스펙 추가
                        thickIn: thickIn, // Now strictly thickness
                        typeIn: typeIn,
                        glassIn: glassIn, // Full spec
                        thickOut: thickOut, // Now strictly thickness
                        typeOut: typeOut,
                        glassOut: glassOut, // Full spec
                        handle: handle,
                        screen: screen,
                        price: priceWithVat,
                        isEtc: isEtc
                    });
                }

                // Step 1.5: Extract Total Sum directly from Row 9 (Index 8) per user request
                // Matches format like: "9,599,799(부가세포함)"
                let itemsTotalSum = totalMaterial + totalEtc; // Backup calculated sum
                let excelTotalSum = 0;

                // Helper to safely parse a value to integer
                const parseVal = (v) => {
                    if (typeof v === 'number') return Math.floor(v);
                    const s = String(v || "").replace(/,/g, "").replace(/\s/g, "");
                    // Match leading digits
                    const m = s.match(/^(\d+)/);
                    return m ? parseInt(m[1], 10) : 0;
                };

                // Robust Search: Scan first 20 rows for "금액총계" or "부가세포함"
                for (let r = 0; r < Math.min(rows.length, 20); r++) {
                    const currentRow = rows[r] || [];
                    for (let c = 0; c < currentRow.length; c++) {
                        const cell = currentRow[c];
                        const strVal = String(cell || "").replace(/\s/g, "");

                        // Priority 1: Cell explicitly contains "부가세포함" and digits (e.g., "9,599,799(부가세포함)")
                        if (strVal.includes("부가세포함")) {
                            const p = parseVal(strVal);
                            if (p > 1000) {
                                excelTotalSum = p;
                                break;
                            }
                        }

                        // Priority 2: Label is "금액총계" or "합계"
                        if (['금액총계', '총계', '합계'].some(label => strVal.includes(label))) {
                            // Check next cell (c+1)
                            const nextVal = parseVal(currentRow[c + 1]);
                            if (nextVal > 1000) {
                                excelTotalSum = nextVal;
                                break;
                            }
                            // Check next-next cell (c+2) - sometimes merged cells gap
                            const nextNextVal = parseVal(currentRow[c + 2]);
                            if (nextNextVal > 1000) {
                                excelTotalSum = nextNextVal;
                                break;
                            }
                        }
                    }
                    if (excelTotalSum > 0) break;
                }

                // If we found a valid total in Row 9, use it. Otherwise fallback to calculated sum.
                // We also adjust totalMaterial to balance the equation: Total = Material + Etc.
                // So Material = Total - Etc.
                const finalTotalSum = excelTotalSum > 0 ? excelTotalSum : itemsTotalSum;
                if (excelTotalSum > 0) {
                    totalMaterial = finalTotalSum - totalEtc;
                }

                resolve({
                    customerName: extractedName,
                    customerPhone: sheetPhone || extractedPhone,
                    address,
                    items,
                    totalMaterial,
                    totalEtc,
                    totalSum: finalTotalSum
                });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
