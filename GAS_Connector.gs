
// WebApp 배포용 Apps Script
// 최종 수정: 2026-01-18 (Admin Overhaul)

const PDF_FOLDER_ID = "1CSv8Rb7cvS2b2QGbbfcsRYSK98Zh-aXO"; 
const SPREADSHEET_ID = "1Bxgy62sYQgstWqEl2zAWSnHIqb5Ftpu_Xzkkv7q4U6c";

function delivery(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'search') {
    return delivery(searchQuote(e.parameter.name, e.parameter.phone, e.parameter.statusType));
  } else if (action === 'get_config') {
    return delivery(getAppConfig());
  }
  return delivery({ success: false, message: "Invalid action" });
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    if (action === 'save') {
      return delivery(saveQuoteData(params));
    } else if (action === 'admin_list') {
      return delivery(getAdminQuoteList());
    } else if (action === 'update_remark') {
      return delivery(updateQuoteRemark(params));
    } else if (action === 'update_items') {
      return delivery(updateQuoteItems(params));
    } else if (action === 'get_config') {
      return delivery(getAppConfig());
    }
    return delivery({ success: false, message: "Invalid action: " + action });
  } catch (err) {
    return delivery({ success: false, message: err.toString() });
  }
}

/**
 * [New] Update Items (Retroactive Fix)
 */
function updateQuoteItems(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('DB');
    if (!sheet) return { success: false, message: "DB 시트가 없습니다." };

    const data = sheet.getDataRange().getValues();
    let targetRow = -1;

    // Search
    for (let i = 1; i < data.length; i++) {
        const rDate = Utilities.formatDate(data[i][0], "GMT+9", "yyyy-MM-dd");
        const rName = String(data[i][3]).trim();
        const rPhone = String(data[i][4]).replace(/[^0-9]/g, ''); 
        const pPhone = String(params.phone).replace(/[^0-9]/g, '');

        if (rDate === params.date && rName === params.name && rPhone === pPhone) {
            targetRow = i + 1; // 1-based index
            break; 
        }
    }

    if (targetRow === -1) {
        return { success: false, message: "해당 견적을 찾을 수 없습니다." };
    }

    // Update Items (Column R -> Index 18)
    // params.items should be the ARRAY of items
    sheet.getRange(targetRow, 18).setValue(JSON.stringify(params.items));
    
    return { success: true, message: "항목 정보가 수정되었습니다." };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * [관리자] 데이터 저장
 */
function saveQuoteData(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('DB');
    if (!sheet) {
      sheet = ss.insertSheet('DB');
      sheet.appendRow([
        "접수일", "지점", "견적구분", "고객명", "전화번호", "주소", 
        "KCC견적가", "최종견적가", "최종혜택가", "할인율", "추가할인", 
        "마진금액", "마진율", 
        "24구독", "36구독", "48구독", "60구독", 
        "세부견적", "PDF링크", "비고"
      ]);
    }

    let pdfUrl = "";
    if (data.fileData && data.fileName) {
      try {
        const decoded = Utilities.base64Decode(data.fileData);
        const blob = Utilities.newBlob(decoded, data.mimeType || "application/pdf", data.fileName);
        const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        pdfUrl = file.getUrl();
      } catch (e) {
        return { success: false, message: "PDF 저장 중 오류: " + e.toString() };
      }
    }

    sheet.appendRow([
      new Date(),
      data.branch || "",
      data.statusType || "가견적",
      data.customerName || "",
      "'" + (data.customerPhone || ""),
      data.address || "",
      data.totalSum || 0,
      data.finalQuote || 0,
      data.finalBenefit || 0,
      data.discountRate || 0,
      data.extraDiscount || 0,
      data.marginAmount || 0,
      data.marginRate || 0,
      data.subs[24] || 0,
      data.subs[36] || 0,
      data.subs[48] || 0,
      data.subs[60] || 0,
      JSON.stringify(data.items || []),
      pdfUrl,
      "" // 비고 (초기값 공란)
    ]);

    return { success: true, message: "데이터가 성공적으로 저장되었습니다." };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function searchQuote(name, phone, statusType) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('DB');
    if (!sheet) return { success: false, message: "데이터가 없습니다." };
    
    // Fetch Config Data (Appliances & Banners)
    const configData = fetchConfig(ss);
    
    const data = sheet.getDataRange().getValues();
    const targetPhone = String(phone).replace(/[^0-9]/g, '');
    let foundData = null;

    for (let i = data.length - 1; i >= 1; i--) {
      const rowName = String(data[i][3]).trim();
      const rowPhone = String(data[i][4]).replace(/[^0-9]/g, '');
      const rowStatus = String(data[i][2]).trim();

      if (rowName === String(name).trim() && rowPhone === targetPhone && (!statusType || rowStatus === String(statusType).trim())) {
        foundData = {
          date: Utilities.formatDate(data[i][0], "GMT+9", "yyyy-MM-dd"),
          branch: data[i][1],
          status: data[i][2],
          name: rowName,
          phone: String(data[i][4]).replace(/^'/, "").trim(),
          address: data[i][5],
          originalPrice: data[i][6],
          finalQuote: data[i][7],
          finalBenefit: data[i][8],
          discountRate: data[i][9],
          extraDiscount: data[i][10],
          subs: { 24: data[i][13], 36: data[i][14], 48: data[i][15], 60: data[i][16] },
          items: JSON.parse(data[i][17] || "[]"),
          pdfUrl: data[i][18] || ""
        };
        break;
      }
    }

    if (!foundData) return { success: false, message: "일치하는 견적 정보를 찾을 수 없습니다." };

    return { success: true, data: foundData, config: configData };

  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getAppConfig() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return { success: true, config: fetchConfig(ss) };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// [New] Fetch All Quotes for Admin
function getAdminQuoteList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('DB');
    if (!sheet) return { success: true, data: [] }; // No DB yet is fine

    const data = sheet.getDataRange().getValues();
    const list = [];
    
    // Header is row 0. Iterate from 1.
    // Use reverse order for latest first? Or just normal order. Normal is fine for table.
    // Let's do Reverse to show latest on top.
    for (let i = data.length - 1; i >= 1; i--) {
       const row = data[i];
       list.push({
         id: i + 1, // Row Index as pseudo-ID
         date: Utilities.formatDate(row[0], "GMT+9", "yyyy-MM-dd"),
         branch: row[1],
         type: row[2],
         name: row[3],
         phone: String(row[4]).replace(/^'/, ""),
         address: row[5],
         kccPrice: row[6],
         finalQuote: row[7],
         finalBenefit: row[8],
         discountRate: row[9],
         extraDiscount: row[10],
         marginAmt: row[11],
         marginRate: row[12],
         sub24: row[13],
         sub36: row[14],
         sub48: row[15],
         sub60: row[16],
         items: row[17], // Column R is Index 17
         pdfUrl: row[18],
         remark: row[19] || "" // Column T is Index 19
       });
    }

    return { success: true, data: list };
  } catch (e) {
     return { success: false, message: e.toString() };
  }
}

// [New] Update Remark
function updateQuoteRemark(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('DB');
    if (!sheet) return { success: false, message: "DB 시트가 없습니다." };

    // We identify row by Date, Name, Phone because Row ID might shift if rows are deleted (though we don't handle delete yet).
    // But passing Row ID (params.id) is safer IF we assume no concurrent deletes.
    // Let's use the provided params to find the match.
    // Params: date (string yyyy-MM-dd), name, phone, newRemark
    
    const data = sheet.getDataRange().getValues();
    let targetRow = -1;

    // Search
    for (let i = 1; i < data.length; i++) {
        const rDate = Utilities.formatDate(data[i][0], "GMT+9", "yyyy-MM-dd");
        const rName = String(data[i][3]).trim();
        const rPhone = String(data[i][4]).replace(/[^0-9]/g, ''); 
        const pPhone = String(params.phone).replace(/[^0-9]/g, '');

        if (rDate === params.date && rName === params.name && rPhone === pPhone) {
            targetRow = i + 1; // 1-based index
            break; 
        }
    }

    if (targetRow === -1) {
        return { success: false, message: "해당 견적을 찾을 수 없습니다." };
    }

    // Update Remark (Column T -> Index 20)
    sheet.getRange(targetRow, 20).setValue(params.remark);
    
    return { success: true, message: "비고가 수정되었습니다." };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Fetch Config from 'Config' Sheet
 * Columns:
 * A: Type (A/B)
 * B: Category
 * C: ImgURL
 * D: Name
 * E: Model
 * F: Link
 * H: Banner Img URL
 * I: Banner Link
 * J: Height (Optional)
 */
function fetchConfig(ss) {
  try {
    const sheet = ss.getSheetByName('Config');
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    const appliances = { A: [], B: [] };
    const banners = [];

    // Skip Header (Row 0)
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Appliances Parsing (Cols A-F -> Index 0-5)
        const type = String(row[0]).trim().toUpperCase();
        if (type === 'A' || type === 'B') {
            appliances[type].push({
                type: type,
                cat: row[1],
                img: row[2],
                name: row[3],
                model: row[4],
                link: row[5]
            });
        }

        // Banners Parsing (Cols H-J -> Index 7-9)
        // Check if banner img url exists
        if (row[7] && String(row[7]).trim() !== '') {
            banners.push({
                img: row[7],
                link: row[8],
                height: row[9]
            });
        }
    }

    return {
        appliances: appliances,
        banners: banners
    };
  } catch (e) {
    console.error("Fetch Config Error: " + e.toString());
    return null;
  }
}
