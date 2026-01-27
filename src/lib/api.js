// API endpoint 설정 (GAS 웹앱 URL을 얻은 후 여기에 넣으시면 됩니다)
export const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyU0Jd3Cl5j93kt7rHXSOC2pIIYOiKjQ2wh-E8Ir0vF33_YVk6_J0cYluilNhca1S-J/exec";

const delivery = async (params) => {
    try {
        console.log("API 전송 시작:", params);

        // GAS와의 CORS 문제를 방지하기 위해 'text/plain'을 명시합니다.
        // 이렇게 하면 OPTIONS(preflight) 요청을 보내지 않아 GAS에서 정상 수신 가능합니다.
        const response = await fetch(GAS_API_URL, {
            method: "POST",
            mode: "cors", // CORS 허용
            redirect: "follow", // 리다이렉트 자동 추적
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태코드: ${response.status}`);
        }

        const result = await response.json();
        console.log("API 응답 완료:", result);
        return result;
    } catch (error) {
        console.error("API Error Detail:", error);
        return { success: false, message: "서버 연결에 실패했습니다: " + error.message };
    }
};

/**
 * 견적 데이터 저장
 */
/**
 * 견적 데이터 저장 (PDF 파일 포함 가능)
 */
export const saveQuote = async (data, file) => {
    let filePayload = {};

    if (file) {
        try {
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]); // Remove "data:application/pdf;base64,"
                reader.onerror = error => reject(error);
            });

            filePayload = {
                fileData: base64Data,
                fileName: file.name,
                mimeType: file.type
            };
        } catch (error) {
            console.error("File Conversion Error:", error);
            // Continue without file if error? Or fail?
            // Let's log it but try to save the data at least.
        }
    }

    return await delivery({ action: "save", ...data, ...filePayload });
};

export const getAdminQuoteList = async () => {
    return await delivery({ action: 'admin_list' });
};

export const updateQuoteRemark = async (params) => {
    // params: { date, name, phone, remark }
    return await delivery({ action: 'update_remark', ...params });
};

export const updateQuoteItems = async (params) => {
    // params: { date, name, phone, items }
    return await delivery({ action: 'update_items', ...params });
};

/**
 * 견적 데이터 조회
 */
export const searchQuote = async (name, phone, statusType) => {
    try {
        const queryParams = new URLSearchParams({
            action: "search",
            name: name,
            phone: phone,
            statusType: statusType || ""
        });
        const response = await fetch(`${GAS_API_URL}?${queryParams.toString()}`, {
            method: "GET",
        });
        return await response.json();
    } catch (error) {
        console.error("Search API Error:", error);
        return { success: false, message: "서버 연결에 실패했습니다." };
    }
};
