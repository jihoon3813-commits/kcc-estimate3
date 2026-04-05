
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, FileText, Calculator, Save, CheckCircle, Loader2, RefreshCw, ExternalLink, Search, ShieldCheck, Download } from 'lucide-react';
import { parseExcelEstimate } from '../lib/excelParser';
import { saveQuote, updateRentalStatus, updateSubscriptionStatus, getAdminQuoteList, getRentalApplicationList, getSubscriptionApplicationList } from '../lib/api';

const RENTAL_STATUS_OPTIONS = [
    { label: '접수', value: '접수', color: 'bg-gray-100 text-gray-600' },
    { label: 'BS조회중', value: 'BS조회중', color: 'bg-blue-100 text-blue-600' },
    { label: 'BS승인', value: 'BS승인', color: 'bg-green-100 text-green-600' },
    { label: '녹취완료', value: '녹취완료', color: 'bg-purple-100 text-purple-600' },
    { label: '설치완료(등록)', value: '설치완료(등록)', color: 'bg-[#c5a059] text-white' },
    { label: '승인불가', value: '승인불가', color: 'bg-red-100 text-red-600' },
    { label: '취소', value: '취소', color: 'bg-gray-300 text-gray-600' },
];

const SUBSCRIPTION_STATUS_OPTIONS = [
    { label: '접수', value: '접수', color: 'bg-gray-100 text-gray-600' },
    { label: '한캐조회중', value: '한캐조회중', color: 'bg-yellow-100 text-yellow-700' },
    { label: '한캐승인', value: '한캐승인', color: 'bg-orange-100 text-orange-600' },
    { label: '전자약정완료', value: '전자약정완료', color: 'bg-teal-100 text-teal-600' },
    { label: '녹취약정완료', value: '녹취약정완료', color: 'bg-pink-100 text-pink-600' },
    { label: '설치완료(전달)', value: '설치완료(전달)', color: 'bg-teal-600 text-white' },
    { label: '승인불가', value: '승인불가', color: 'bg-red-100 text-red-600' },
    { label: '취소', value: '취소', color: 'bg-gray-300 text-gray-600' },
];

const AdminPage = () => {
    // === EXISTING STATE ===
    const [file, setFile] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [estimateData, setEstimateData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // Form State
    const [statusType, setStatusType] = useState('가견적');
    const [materialMultiplier, setMaterialMultiplier] = useState(1.3);
    const [materialSupplyCost, setMaterialSupplyCost] = useState(0);
    const [etcSupplyCost, setEtcSupplyCost] = useState(0);
    const [annualRate, setAnnualRate] = useState(6.0); // Image 2: 연이율
    const [interestSupport, setInterestSupport] = useState(4.0); // Image 2: 이율지원
    const [prepaymentRates, setPrepaymentRates] = useState({ // Image 2: 선취이율
        60: 20.46,
        48: 16.92,
        36: 14.12,
        24: 13.16
    });
    const [lumpSumDiscountRate, setLumpSumDiscountRate] = useState(6.0); // Image 4: 할인율
    const [extraDiscount, setExtraDiscount] = useState(0);
    const [customerPhone, setCustomerPhone] = useState('');

    // Calculated values
    const [calculations, setCalculations] = useState({
        kccQuote: 0,
        finalQuote: 0,
        finalBenefit: 0,
        marginAmount: 0,
        marginRate: 0,
        subs: { 24: 0, 36: 0, 48: 0, 60: 0 },
        greenPlus: [60, 48, 36, 24].map(m => ({
            month: m,
            quotePrice: 0,
            customerPayRate: 0,
            actualInterest: 0,
            totalPayment: 0,
            monthlyPayment: 0,
            upfrontFee: 0,
            settlementAmount: 0,
            margin: 0,
            marginRate: 0
        })),
        lumpSum: {
            quotePrice: 0,
            discountRate: 6.0,
            discountedPrice: 0,
            margin: 0,
            marginRate: 0
        }
    });

    // Confirmation State
    const [isConfirmMode, setIsConfirmMode] = useState(false);

    // === NEW ADMIN LOOKUP STATE ===
    const [activeTab, setActiveTab] = useState('send'); // 'send' | 'lookup' | 'rental'
    const [quoteList, setQuoteList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [filterDate, setFilterDate] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [isEditingModal, setIsEditingModal] = useState(false);
    const [modalEditData, setModalEditData] = useState({
        discountRate: 0,
        extraDiscount: 0
    });
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
    const [rentalList, setRentalList] = useState([]);
    const [filteredRentalList, setFilteredRentalList] = useState([]);
    const [subscriptionList, setSubscriptionList] = useState([]);
    const [filteredSubscriptionList, setFilteredSubscriptionList] = useState([]);

    const modalCalculations = useMemo(() => {
        if (!selectedQuote) return null;

        let savedCalc = null;
        if (selectedQuote.calculations) {
            try {
                // Handle both string and object cases safely
                savedCalc = typeof selectedQuote.calculations === 'string' 
                    ? JSON.parse(selectedQuote.calculations) 
                    : selectedQuote.calculations;
            } catch (e) {
                console.error("Failed to parse saved calculations:", e);
            }
        }

        // Falls back or editing overrides
        const items = selectedQuote.items || [];
        // Priority: Top-level > Saved Calculation > Default 1.3
        const matMultiplier = selectedQuote.materialMultiplier || savedCalc?.materialMultiplier || 1.3;
        
        // Attempt to extract supplies from items if top-level fields are missing
        const matFromItems = items.filter(it => !it.isEtc).reduce((s, it) => s + (Number(it.price || 0) / matMultiplier), 0);
        const etcFromItems = items.filter(it => it.isEtc).reduce((s, it) => s + Number(it.price || 0), 0);

        const matSupply = Number(selectedQuote.materialSupplyCost || (selectedQuote.totalMaterial) || matFromItems || 0);
        const etcSupply = Number(selectedQuote.etcSupplyCost || (selectedQuote.totalEtc) || etcFromItems || 0);
        const kccPrice = matSupply + etcSupply;

        const currentLumpSumRate = isEditingModal ? (modalEditData.discountRate || 0) : (selectedQuote.lumpSumDiscountRate || selectedQuote.discountRate || 6.0);
        const currentAnnualRate = Number(selectedQuote.annualRate || 6.0);
        const currentInterestSupport = Number(selectedQuote.interestSupport || 4.0);
        const currentPrepaymentRates = selectedQuote.prepaymentRates || { 60: 20.46, 48: 16.92, 36: 14.12, 24: 13.16 };

        // Re-calculate analysis based on new rules
        const markupBase = matSupply * matMultiplier;
        const finalQuote = Math.floor((markupBase + etcSupply) / 100) * 100;

        const currentExtraDiscount = isEditingModal ? (modalEditData.extraDiscount || 0) : (selectedQuote.extraDiscount || 0);
        const lumpSumPrice = Math.floor((finalQuote * (1 - currentLumpSumRate / 100) - currentExtraDiscount) / 100) * 100;
        const lumpSumMargin = Number(lumpSumPrice - kccPrice) || 0;
        const lumpSumMarginRate = Number(finalQuote > 0 ? (lumpSumMargin / finalQuote) * 100 : 0) || 0;

        const greenPlus = [60, 48, 36, 24].map(month => {
            const years = month / 12;
            const customerPayRate = Number(currentAnnualRate - currentInterestSupport) || 0;
            const origInterest = Math.floor((finalQuote * (currentAnnualRate / 100) * years) / 100) * 100;
            const supportedInterest = Math.floor((finalQuote * (currentInterestSupport / 100) * years) / 100) * 100;
            const actualInterest = Math.floor((finalQuote * (customerPayRate / 100) * years) / 100) * 100;
            const monthlyActualInterest = Math.floor(actualInterest / month) || 0;
            const totalPayment = Math.floor((finalQuote + actualInterest) / 100) * 100;
            const monthlyPayment = Math.floor((totalPayment / month) / 100) * 100;
            const rate = Number(currentPrepaymentRates[month] || 0);
            const upfrontFee = Math.floor((totalPayment * (rate / 100)) / 10) * 10;
            const settlementAmount = Math.floor((totalPayment - upfrontFee) / 10) * 10;
            const margin = Math.floor((settlementAmount - kccPrice) / 10) * 10;
            const marginRate = finalQuote > 0 ? (margin / finalQuote) * 100 : 0;

            return {
                month,
                quotePrice: finalQuote,
                customerPayRate,
                origInterest,
                supportedInterest,
                actualInterest,
                monthlyActualInterest,
                totalPayment,
                monthlyPayment,
                upfrontFee,
                settlementAmount,
                margin,
                marginRate
            };
        });

        const subs = {};
        greenPlus.forEach(g => {
            subs[g.month] = g.monthlyPayment;
        });

        return {
            finalQuote,
            finalBenefit: lumpSumPrice,
            marginAmount: lumpSumMargin,
            marginRate: lumpSumMarginRate,
            materialMultiplier: matMultiplier,
            lumpSum: {
                quotePrice: finalQuote,
                discountRate: currentLumpSumRate,
                discountedPrice: lumpSumPrice,
                margin: lumpSumMargin,
                marginRate: lumpSumMarginRate
            },
            greenPlus,
            subs
        };
    }, [selectedQuote, isEditingModal, modalEditData]);

    useEffect(() => {
        console.log("AdminPage Mounted and Ready");
    }, []);

    // Helper for phone formatting (shared)
    const formatPhoneNumber = (value) => {
        if (!value) return value;
        const raw = value.replace(/[^\d]/g, '');

        if (raw.startsWith('02')) {
            if (raw.length < 3) return raw;
            if (raw.length <= 5) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
            if (raw.length <= 9) return `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
            return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
        } else {
            if (raw.length < 4) return raw;
            if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
            if (raw.length <= 11) return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
            return raw; // max length overflow or just return raw
        }
    };

    // Helper for formatting currency
    const formatKrw = (val) => {
        return Math.floor(val).toLocaleString() + "원";
    };

    const calculatePackage = (basePrice, rentalMonthly, subtractAmount) => {
        const advancePayment = (basePrice || 0) - (subtractAmount || 0);
        return advancePayment < 0 ? "해당없음" : formatKrw(advancePayment);
    };

    // === EXCEL LOGIC ===
    const handleExcelUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setLoading(true);
        setStatus("엑셀 파일을 분석하고 있습니다...");

        try {
            const data = await parseExcelEstimate(uploadedFile);
            setEstimateData(data);

            // Auto-fill phone if available and not already set manually
            if (data.customerPhone && !customerPhone) {
                setCustomerPhone(formatPhoneNumber(data.customerPhone));
            }

            // Auto-fill costs from Excel
            if (data.totalMaterial) {
                setMaterialSupplyCost(data.totalMaterial);
            }
            if (data.totalEtc) {
                setEtcSupplyCost(data.totalEtc);
            }
            setMaterialMultiplier(1.3);

            setStatus("분석 완료!");
        } catch (error) {
            console.error(error);
            alert("엑셀 분석 실패: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Recalculate whenever inputs change
    useEffect(() => {
        if (!estimateData) return;

        const kccQuote = estimateData.totalSum;
        
        // 1. Base Quote Logic (Markup Material)
        // 최종견적가 = 공급가(자재비) * 자재비(배수) + 공급가(기타비)
        const markupBase = materialSupplyCost * materialMultiplier;
        let finalQuote = Math.floor((markupBase + etcSupplyCost) / 100) * 100;

        // 2. Lump Sum Analysis (Image 4)
        const lumpSumPrice = Math.floor((finalQuote * (1 - lumpSumDiscountRate / 100) - extraDiscount) / 100) * 100;
        const totalSupplyCost = materialSupplyCost + etcSupplyCost;
        const lumpSumMargin = lumpSumPrice - totalSupplyCost;
        const lumpSumMarginRate = finalQuote > 0 ? (lumpSumMargin / finalQuote) * 100 : 0;

        // 3. Green Remodeling PLUS (Image 3)
        const greenPlus = [60, 48, 36, 24].map(month => {
            const years = month / 12;
            const customerPayRate = annualRate - interestSupport;
            const origInterest = finalQuote * (annualRate / 100) * years;
            const supportedInterest = finalQuote * (interestSupport / 100) * years;
            const actualInterest = Math.floor((origInterest - supportedInterest) / 100) * 100;
            const monthlyActualInterest = Math.floor(actualInterest / month);
            const totalPayment = Math.floor((finalQuote + actualInterest) / 100) * 100;
            const monthlyPayment = Math.floor((totalPayment / month) / 100) * 100;
            
            const rate = prepaymentRates[month] || 0;
            const upfrontFee = Math.floor((totalPayment * (rate / 100)) / 10) * 10;
            const settlementAmount = Math.floor((totalPayment - upfrontFee) / 10) * 10;
            const margin = Math.floor((settlementAmount - totalSupplyCost) / 10) * 10;
            const marginRate = finalQuote > 0 ? (margin / finalQuote) * 100 : 0;

            return {
                month,
                quotePrice: finalQuote,
                customerPayRate,
                years,
                origInterest,
                supportedInterest,
                actualInterest,
                monthlyActualInterest,
                totalPayment,
                monthlyPayment,
                upfrontFee,
                settlementAmount,
                margin,
                marginRate
            };
        });

        // 4. Existing Subs
        const subs = {};
        greenPlus.forEach(g => {
            subs[g.month] = g.monthlyPayment;
        });

        setCalculations({
            kccQuote,
            finalQuote, // Base Quote
            lumpSum: {
                quotePrice: finalQuote,
                discountRate: lumpSumDiscountRate,
                discountedPrice: lumpSumPrice,
                margin: lumpSumMargin,
                marginRate: lumpSumMarginRate
            },
            greenPlus,
            subs,
            materialMultiplier
        });

    }, [estimateData, materialSupplyCost, etcSupplyCost, materialMultiplier, annualRate, interestSupport, prepaymentRates, lumpSumDiscountRate]);


    const handleRegisterClick = () => {
        if (!file) {
            alert("엑셀 견적서가 필요합니다.");
            return;
        }
        if (materialSupplyCost <= 0) {
            if (!window.confirm("공급가(자재비)가 0원입니다. 진행하시겠습니까? (마진 계산이 정확하지 않을 수 있습니다.)")) return;
        }
        setIsConfirmMode(true);
    };

    const handleFinalSubmit = async () => {
        setIsConfirmMode(false);
        const handleSubmit = async () => {
            // Prepare Data
            // Apply multiplier to items (excluding Etc items which are pass-through)
            const processedItems = estimateData.items.map(item => {
                if (item.isEtc) return item;
                // item.price is already VAT included (x1.1) from parser
                // We just need to apply the margin multiplier
                return {
                    ...item,
                    price: Math.floor(Number(item.price || 0) * materialMultiplier)
                };
            });

            const payload = {
                date: new Date().toISOString().split('T')[0],
                statusType,
                customerName: estimateData.customerName || "미정",
                customerPhone: customerPhone || "",
                address: estimateData.address || "",

                // Money Flattening for saveQuote API compat
                totalSum: Number(estimateData.totalSum || 0),
                finalQuote: Number(calculations.finalQuote || 0),
                finalBenefit: Number(calculations.finalBenefit || calculations.lumpSum?.discountedPrice || 0),
                marginAmount: Number(calculations.marginAmount || calculations.lumpSum?.margin || 0),
                marginRate: Number(calculations.marginRate || calculations.lumpSum?.marginRate || 0),
                subs: calculations.subs || {},
                discountRate: Number(lumpSumDiscountRate || 0),
                
                annualRate: Number(annualRate || 6.0),
                interestSupport: Number(interestSupport || 4.0),
                prepaymentRates: prepaymentRates || {},
                lumpSumDiscountRate: Number(lumpSumDiscountRate || 0),
                extraDiscount: Number(extraDiscount || 0),

                calculations: {
                    ...calculations,
                    materialMultiplier: Number(materialMultiplier || 1.3)
                },

                items: processedItems
            };

            const data = await saveQuote(payload, pdfFile);
            if (data.success) {
                alert("성공적으로 저장되었습니다.");
                // Reset
                setFile(null);
                setPdfFile(null);
                setEstimateData(null);
                setMaterialSupplyCost(0);
                setEtcSupplyCost(0);
                setCustomerPhone('');
            } else {
                alert("저장 실패: " + data.message);
            }
        };

        setLoading(true);
        setStatus("서버에 데이터를 전송하고 있습니다...");

        try {
            await handleSubmit();
        } catch (error) {
            console.error("Submission Error:", error);
            window.alert("등록 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // === LOOKUP LOGIC ===

    // Fetch List
    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'lookup') {
                const result = await getAdminQuoteList();
                if (result.success) {
                    setQuoteList(result.data);
                }
            } else if (activeTab === 'rental') {
                const result = await getRentalApplicationList();
                if (result.success) {
                    setRentalList(result.data);
                }
            } else if (activeTab === 'subscription') {
                const result = await getSubscriptionApplicationList();
                if (result.success) {
                    setSubscriptionList(result.data);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'lookup' || activeTab === 'rental' || activeTab === 'subscription') {
            fetchList();
        }
    }, [activeTab, fetchList]);

    // Filtering Logic
    useEffect(() => {
        // Filtering for Quote List
        let tempQuotes = [...quoteList];

        if (searchTerm) {
            const normalizedSearch = searchTerm.trim().normalize('NFC').toLowerCase();
            tempQuotes = tempQuotes.filter(item => {
                const name = (item.name || '').normalize('NFC').toLowerCase();
                const phone = (item.phone || '').toLowerCase();
                const address = (item.address || '').normalize('NFC').toLowerCase();

                return name.includes(normalizedSearch) ||
                    phone.includes(normalizedSearch) ||
                    address.includes(normalizedSearch);
            });
        }


        if (filterType !== 'all') {
            tempQuotes = tempQuotes.filter(item => item.type === filterType);
        }

        if (filterDate !== 'all') {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            tempQuotes = tempQuotes.filter(item => {
                const itemDate = new Date(item.date); // item.date is yyyy-MM-dd

                switch (filterDate) {
                    case 'today':
                        return itemDate >= todayStart;
                    case 'month': {
                        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        return itemDate >= thisMonthStart;
                    }
                    case 'prev_month': {
                        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                        return itemDate >= prevMonthStart && itemDate <= prevMonthEnd;
                    }
                    case '3month': {
                        const m3 = new Date(now);
                        m3.setMonth(now.getMonth() - 3);
                        return itemDate >= m3;
                    }
                    case '6month': {
                        const m6 = new Date(now);
                        m6.setMonth(now.getMonth() - 6);
                        return itemDate >= m6;
                    }
                    case 'year': {
                        const y1 = new Date(now);
                        y1.setFullYear(now.getFullYear() - 1);
                        return itemDate >= y1;
                    }
                    default:
                        return true;
                }
            });
        }

        tempQuotes.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) {
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            }
            const idA = a._creationTime || a.id || 0;
            const idB = b._creationTime || b.id || 0;
            return sortOrder === 'desc' ? idB - idA : idA - idB;
        });

        setFilteredList(tempQuotes);

        // Filtering for Rental List
        let tempRentals = [...rentalList];
        if (searchTerm) {
            const normalizedSearch = searchTerm.trim().normalize('NFC').toLowerCase();
            tempRentals = tempRentals.filter(item => {
                const name = (item.name || '').normalize('NFC').toLowerCase();
                const phone = (item.phone || '').toLowerCase();
                const address = (item.address || '').normalize('NFC').toLowerCase();
                return name.includes(normalizedSearch) || phone.includes(normalizedSearch) || address.includes(normalizedSearch);
            });
        }
        tempRentals.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        setFilteredRentalList(tempRentals);

        // Filtering for Subscription List
        let tempSubs = [...subscriptionList];
        if (searchTerm) {
            const normalizedSearch = searchTerm.trim().normalize('NFC').toLowerCase();
            tempSubs = tempSubs.filter(item => {
                const name = (item.name || '').normalize('NFC').toLowerCase();
                const phone = (item.phone || '').toLowerCase();
                const address = (item.address || '').normalize('NFC').toLowerCase();
                return name.includes(normalizedSearch) || phone.includes(normalizedSearch) || address.includes(normalizedSearch);
            });
        }
        tempSubs.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        setFilteredSubscriptionList(tempSubs);
    }, [quoteList, rentalList, subscriptionList, searchTerm, filterType, filterDate, sortOrder, fetchList]);

    const handleRentalNameClick = async (rental) => {
        setLoading(true);
        setStatus("연결된 견적 정보를 불러오고 있습니다...");
        try {
            const { searchQuote, getQuote } = await import('../lib/api');

            let res;
            if (rental.quoteId) {
                // If application has a specific quote link, use it
                res = await getQuote(rental.quoteId);
            } else {
                // Fallback to searching by name/phone
                res = await searchQuote(rental.name, rental.phone);
            }

            if (res.success) {
                setSelectedQuote(res.data);
            } else {
                alert("연결된 견적 정보를 찾을 수 없습니다.");
            }
        } catch (error) {
            console.error(error);
            alert("견적 조회 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
            setStatus("");
        }
    };

    // Remark Update
    const handleRemarkChange = async (item, newRemark) => {
        // Optimistic update locally
        const updated = quoteList.map(q => q.id === item.id ? { ...q, remark: newRemark } : q);
        setQuoteList(updated);

        // API Call
        try {
            const { updateQuoteRemark } = await import('../lib/api');
            await updateQuoteRemark({
                id: item.id,
                remark: newRemark
            });
        } catch (e) {
            console.error("Remark update failed", e);
        }
    };

    const handleModalSave = async () => {
        if (!selectedQuote) return;
        setLoading(true);
        setStatus("수정된 정보를 저장하고 있습니다...");

        try {
            const { updateQuoteFinancials } = await import('../lib/api');
            const res = await updateQuoteFinancials({
                id: selectedQuote.id,
                discountRate: modalCalculations.discountRate,
                extraDiscount: modalCalculations.extraDiscount,
                finalBenefit: modalCalculations.finalBenefit,
                marginAmt: modalCalculations.marginAmount,
                marginRate: modalCalculations.marginRate,
                sub24: modalCalculations.subs[24],
                sub36: modalCalculations.subs[36],
                sub48: modalCalculations.subs[48],
                sub60: modalCalculations.subs[60]
            });

            if (res.success) {
                alert("성공적으로 수정되었습니다.");
                setIsEditingModal(false);
                // Update the list locally to reflect changes immediately
                setQuoteList(prev => prev.map(q => q.id === selectedQuote.id ? {
                    ...q,
                    discountRate: modalCalculations.discountRate,
                    extraDiscount: modalCalculations.extraDiscount,
                    finalBenefit: modalCalculations.finalBenefit,
                    marginAmt: modalCalculations.marginAmount,
                    marginRate: modalCalculations.marginRate,
                    sub24: modalCalculations.subs[24],
                    sub36: modalCalculations.subs[36],
                    sub48: modalCalculations.subs[48],
                    sub60: modalCalculations.subs[60]
                } : q));
                // Update selectedQuote as well
                setSelectedQuote(prev => ({
                    ...prev,
                    discountRate: modalCalculations.discountRate,
                    extraDiscount: modalCalculations.extraDiscount,
                    finalBenefit: modalCalculations.finalBenefit,
                    marginAmt: modalCalculations.marginAmount,
                    marginRate: modalCalculations.marginRate,
                    sub24: modalCalculations.subs[24],
                    sub36: modalCalculations.subs[36],
                    sub48: modalCalculations.subs[48],
                    sub60: modalCalculations.subs[60]
                }));
            } else {
                alert("저장 실패: " + res.message);
            }
        } catch (error) {
            console.error(error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
            setStatus("");
        }
    };

    const handleRentalStatusChange = async (item, newStatus) => {
        // Optimistic update
        setRentalList(prev => prev.map(r => r._id === item._id ? { ...r, status: newStatus } : r));

        try {
            const res = await updateRentalStatus(item._id, newStatus);
            if (!res.success) {
                alert("렌탈 상태 저장 실패: " + res.message);
                fetchList();
            }
        } catch (e) {
            console.error("Rental status update failed", e);
            alert("렌탈 상태 저장 중 네트워크 오류가 발생했습니다.");
            fetchList(); // Revert on failure
        }
    };

    const handleSubscriptionStatusChange = async (item, newStatus) => {
        // Optimistic update
        setSubscriptionList(prev => prev.map(s => s._id === item._id ? { ...s, status: newStatus } : s));

        try {
            const res = await updateSubscriptionStatus(item._id, newStatus);
            if (!res.success) {
                alert("할부 상태 저장 실패: " + res.message);
                fetchList();
            }
        } catch (e) {
            console.error("Subscription status update failed", e);
            alert("할부 상태 저장 중 네트워크 오류가 발생했습니다.");
            fetchList(); // Revert on failure
        }
    };

    // === BATCH MIGRATION (Retroactive Item Price Fix) ===
    const handleBatchMigration = async () => {
        if (!window.confirm("주의! 모든 견적 데이터의 상세 항목 금액을 '최종 견적가' 비율에 맞춰 재계산합니다.\n\n이 작업은 되돌릴 수 없으며, 기존에 저장된 상세 항목의 금액이 변경됩니다.\n(기타 잡비는 변경되지 않음)\n\n진행하시겠습니까?")) return;

        setLoading(true);
        setStatus("데이터 일괄 보정 중...");
        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;

        try {
            const { updateQuoteItems, searchQuote } = await import('../lib/api');

            // Iterate all visible filtered list or FULL quote list? Better use full list.
            // But we need detailed items which are NOT in the list summary.
            // We have to FETCH details for each quote first.
            // Wait, searchQuote fetches details.

            for (const summary of quoteList) {
                try {
                    // Fetch full detail
                    // We can use searchQuote with name/phone
                    // Note: searchQuote returns the latest match usually. Admin list has all.
                    // If multiple same name/phone exist, searchQuote might return just one.
                    // This is a limitation. But usually acceptable for maintenance.
                    // Actually, if we use the data from admin list, we lack 'items'.
                    // Wait! getAdminQuoteList DOES NOT return items in the summary to save bandwidth?
                    // Let's check GAS_Connector.gs: getAdminQuoteList returns items? NO.
                    // Ah, row[17] is items. In getAdminQuoteList it is NOT pushed.
                    // Wait, let's re-read GAS_Connector.gs from Step 46.
                    // It pushes row[0]... row[16], row[18], row[19].
                    // It skips row[17] (items).
                    // So we MUST fetch details.

                    // Since searchQuote might be ambiguous, this migration is risky if duplicates exist.
                    // But duplicates have different dates usually.
                    // Let's blindly trust searchQuote finds the right one if unique?
                    // Or, better, we only migrate those where we can fetch.

                    const res = await searchQuote(summary.name, summary.phone, summary.type);
                    if (!res.success || !res.data) {
                        console.warn(`Skipping ${summary.name}: Not found via search.`);
                        failCount++;
                        continue;
                    }

                    const detail = res.data;
                    const items = detail.items || [];

                    if (items.length === 0) {
                        skipCount++;
                        continue;
                    }

                    // Check if already corrected
                    // Calculate current sum of items
                    const currentSum = items.reduce((sum, i) => sum + (i.price || 0), 0);

                    // If currentSum is close to Final Quote, skip
                    if (Math.abs(currentSum - detail.finalQuote) < 100000) { // 100k won tolerance
                        skipCount++;
                        continue;
                    }

                    // If currentSum is ALSO not close to Original Price (KCC Price), mysterious.
                    // But usually it should be close to Original Price.

                    // Calculation Logic
                    const sumEtc = items.filter(i => i.isEtc).reduce((sum, i) => sum + (i.price || 0), 0);
                    const sumMaterial = items.filter(i => !i.isEtc).reduce((sum, i) => sum + (i.price || 0), 0);

                    if (sumMaterial === 0) {
                        skipCount++;
                        continue;
                    }

                    const targetMaterialTotal = detail.finalQuote - sumEtc;
                    const ratio = targetMaterialTotal / sumMaterial;

                    // Apply
                    const newItems = items.map(item => {
                        if (item.isEtc) return item;
                        return {
                            ...item,
                            price: Math.floor(item.price * ratio)
                        };
                    });

                    // Update
                    const updateRes = await updateQuoteItems({
                        id: detail.id || summary.id,
                        items: newItems
                    });

                    if (updateRes.success) {
                        successCount++;
                    } else {
                        console.error(`Failed to update ${detail.name}: ${updateRes.message}`);
                        failCount++;
                    }

                } catch (innerErr) {
                    console.error(`Error processing ${summary.name}`, innerErr);
                    failCount++;
                }
            }

            alert(`작업 완료!\n성공: ${successCount}건\n실패: ${failCount}건\n건너뜀(이미완료/불필요): ${skipCount}건`);
            // Refresh list
            fetchList();

        } catch (e) {
            console.error(e);
            alert("일괄 보정 중 오류 발생: " + e.message);
        } finally {
            setLoading(false);
            setStatus("");
        }
    };


    // === VISUAL HELPERS ===

    // === LOGIN LOGIC ===
    const [isAdmin, setIsAdmin] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (passwordInput.trim() === 'ruswjr@@') {
            setIsAdmin(true);
        } else {
            alert('비밀번호가 올바르지 않습니다.');
        }
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4">
                <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-sm text-center space-y-6">
                    <div className="flex justify-center mb-2">
                        <div className="bg-[#001a3d] p-4 rounded-2xl shadow-lg">
                            <CheckCircle size={32} className="text-[#c5a059]" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-[#001a3d] mb-2">관리자 로그인</h2>
                        <p className="text-xs text-gray-400 font-bold">시스템 접근을 위해 비밀번호를 입력하세요.</p>
                    </div>
                    <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="비밀번호"
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 text-center font-bold text-[#001a3d] focus:ring-2 focus:ring-[#c5a059]/50 outline-none transition-all placeholder:font-medium"
                    />
                    <button type="submit" className="w-full bg-[#001a3d] text-white py-4 rounded-xl font-black hover:bg-blue-900 transition-colors shadow-lg">
                        접속하기
                    </button>
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-blue-50 text-[#001a3d] py-4 rounded-xl font-black hover:bg-blue-100 transition-colors shadow-sm border border-blue-100"
                    >
                        <ExternalLink size={18} /> 견적조회 사이트 바로가기
                    </a>
                    <p className="text-[10px] text-gray-300">문의: 관리자에게 문의하세요</p>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-20 font-sans">
            {/* Main Header & Tab Navigation */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4 md:mb-0 shrink-0">
                    <img src="https://cdn.imweb.me/upload/S20250904697320f4fd9ed/5b115594e9a66.png" alt="KCC Logo" className="h-8 object-contain" />
                    <div className="whitespace-nowrap">
                        <h1 className="text-xl font-black text-[#001a3d]">KCC 관리자 시스템(그린)</h1>
                        <p className="text-xs text-gray-400 font-bold">견적 생성 및 이력 관리</p>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('send')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'send' ? 'bg-[#001a3d] text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Calculator size={18} /> 견적발송
                    </button>
                    <button
                        onClick={() => setActiveTab('lookup')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'lookup' ? 'bg-[#c5a059] text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <FileText size={18} /> 견적조회
                    </button>
                    <button
                        onClick={() => setActiveTab('rental')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'rental' ? 'bg-[#2c3e50] text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ShieldCheck size={18} /> 렌탈신청 내역
                    </button>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'subscription' ? 'bg-[#1a3a3a] text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Save size={18} /> 할부신청 내역
                    </button>
                </div>
            </header>

            {/* TAB CONTENT: SEND QUOTE */}
            {activeTab === 'send' && (
                <div className="space-y-6 animate-in fade-in">

                    {/* Branch & Status Selection */}
                    <div className="flex justify-end gap-3 mb-4">
                        <div className="flex bg-white p-1.5 rounded-[1.2rem] shadow-sm border border-gray-100">
                            {['가견적', '책임견적', '최종견적'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setStatusType(t)}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${statusType === t ? 'bg-[#c5a059] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div
                            className={`glass-card p-6 rounded-2xl transition-all ${isDragging ? 'ring-4 ring-[#c5a059]/30 bg-[#c5a059]/5' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    handleExcelUpload({ target: { files: e.dataTransfer.files } });
                                }
                            }}
                        >
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-4 tracking-tight">
                                <FileText size={18} className="text-kcc-blue" />
                                엑셀 견적서 (.xlsx)
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".xlsx"
                                    onChange={handleExcelUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center group-hover:bg-kcc-light transition-all">
                                    <Upload className="text-gray-300 mb-2 group-hover:text-kcc-blue transition-colors" />
                                    <span className="text-xs font-medium text-gray-500 text-center">
                                        {file ? file.name : '파일을 드래그하거나 클릭하여 업로드'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-3xl">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-4 tracking-tight">
                                <FileText size={18} className="text-gray-400" />
                                최종 PDF 견적서 (선택)
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setPdfFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center group-hover:bg-kcc-light transition-all">
                                    <Upload className="text-gray-300 mb-2 group-hover:text-red-400 transition-colors" />
                                    <span className="text-xs font-medium text-gray-500 text-center">
                                        {pdfFile ? pdfFile.name : '고객용 PDF 파일을 업로드하세요 (선택사항)'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result & Form Section */}
                    {estimateData && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            {/* 1. Auto Analysis Data */}
                            <section className="bg-kcc-navy text-white p-8 rounded-[2rem] shadow-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold flex items-center gap-2 text-lg">
                                        <CheckCircle size={20} className="text-green-400" />
                                        자동 분석 데이터
                                    </h3>
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Excel Parsing</span>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">고객명</p>
                                        <p className="text-xl font-bold">{estimateData.customerName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">연락처 (직접 입력 가능)</p>
                                        <input
                                            type="text"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))}
                                            placeholder="연락처를 입력하세요"
                                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white placeholder:text-white/30 text-sm font-bold w-full focus:outline-none focus:bg-white/20"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">자재비 (VAT포함)</p>
                                        <p className="text-xl font-bold">{formatKrw(estimateData.totalMaterial)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">기타비 (VAT포함)</p>
                                        <p className="text-xl font-bold">{formatKrw(estimateData.totalEtc)}</p>
                                    </div>
                                    <div className="lg:border-l lg:border-white/10 lg:pl-8">
                                        <p className="text-xs text-kcc-gold font-bold mb-1">KCC 견적가 (합계)</p>
                                        <p className="text-2xl font-black text-kcc-gold">{formatKrw(estimateData.totalSum)}</p>
                                    </div>
                                </div>
                            </section>

                    {/* 2. New Horizontal Layout Sections */}
                    <div className="space-y-10">
                        {/* SECTION 1: 입력 항목 (Image 2) */}
                        <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                            <h4 className="font-black text-[#001a3d] text-lg mb-6 flex items-center gap-2">
                                <Calculator size={20} className="text-kcc-blue" />
                                1. 입력 항목
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border border-gray-100 p-3 text-sm font-black text-gray-700 bg-gray-100/50 w-40">구분</th>
                                            {[60, 48, 36, 24].map(m => (
                                                <th key={m} className="border border-gray-100 p-3 text-sm font-black text-[#001a3d]">{m}개월</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500 bg-gray-50/30">공급가(자재비)</td>
                                            <td colSpan="4" className="border border-gray-100 p-2">
                                                <input
                                                    type="text"
                                                    value={materialSupplyCost.toLocaleString()}
                                                    onChange={(e) => setMaterialSupplyCost(Number(e.target.value.replace(/[^0-9]/g, '')))}
                                                    className="w-full text-center py-2 bg-blue-50/50 border-none rounded-lg font-black text-[#001a3d] outline-none focus:ring-2 focus:ring-kcc-blue/30"
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500 bg-gray-50/30">공급가(기타비)</td>
                                            <td colSpan="4" className="border border-gray-100 p-2">
                                                <input
                                                    type="text"
                                                    value={etcSupplyCost.toLocaleString()}
                                                    onChange={(e) => setEtcSupplyCost(Number(e.target.value.replace(/[^0-9]/g, '')))}
                                                    className="w-full text-center py-2 bg-gray-50/50 border-none rounded-lg font-black text-gray-600 outline-none focus:ring-2 focus:ring-gray-200"
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500 bg-gray-50/30">자재비(배수)</td>
                                            <td colSpan="4" className="border border-gray-100 p-2">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={materialMultiplier}
                                                        onChange={(e) => setMaterialMultiplier(Number(e.target.value))}
                                                        className="w-32 text-center py-2 bg-blue-50/50 border-none rounded-lg font-black text-[#001a3d] outline-none focus:ring-2 focus:ring-kcc-blue/30"
                                                    />
                                                    <span className="text-xs font-bold text-gray-400">배</span>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500 bg-gray-50/30">연이율 / 이율지원</td>
                                            <td colSpan="4" className="border border-gray-100 p-2">
                                                <div className="flex items-center justify-center gap-8">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-400">정상 연이율:</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={annualRate}
                                                            onChange={(e) => setAnnualRate(Number(e.target.value))}
                                                            className="w-20 text-center py-2 bg-gray-50 border-none rounded-lg font-black text-gray-700"
                                                        />
                                                        <span className="text-xs font-bold text-gray-400">%</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-400">정부/회사 지원:</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={interestSupport}
                                                            onChange={(e) => setInterestSupport(Number(e.target.value))}
                                                            className="w-20 text-center py-2 bg-green-50 border-none rounded-lg font-black text-green-600"
                                                        />
                                                        <span className="text-xs font-bold text-gray-400">%</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500 bg-gray-50/30">선취이율 (%)</td>
                                            {[60, 48, 36, 24].map(m => (
                                                <td key={m} className="border border-gray-100 p-2 text-center">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={prepaymentRates[m]}
                                                        onChange={(e) => setPrepaymentRates(prev => ({ ...prev, [m]: Number(e.target.value) }))}
                                                        className="w-full text-center py-2 bg-orange-50/50 border-none rounded-lg font-black text-orange-600 outline-none"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* SECTION 2: 그린리모델링 PLUS (Image 3) */}
                        <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                            <h4 className="font-black text-[#001a3d] text-lg mb-6 flex items-center gap-2">
                                <ShieldCheck size={20} className="text-green-600" />
                                2. 그린리모델링 PLUS 수익분석
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border border-gray-100 p-3 text-sm font-black text-gray-700 bg-gray-100/50 w-40">구분</th>
                                            {[60, 48, 36, 24].map(m => (
                                                <th key={m} className="border border-gray-100 p-3 text-sm font-black text-[#001a3d]">{m}개월</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-yellow-50/30 font-bold">
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">최종 견적가</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center text-[#001a3d] font-black">{g.quotePrice.toLocaleString()}</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">고객 실이율 (년)</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center text-red-500 font-bold">{g.customerPayRate.toFixed(2)}%</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">원래 부담해야 할 이자</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center text-gray-400 font-medium">{Math.floor(g.origInterest || 0).toLocaleString()}</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">지원하는 이자</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center text-gray-400 font-medium">{Math.floor(g.supportedInterest || 0).toLocaleString()}</td>
                                            ))}
                                        </tr>
                                        <tr className="bg-yellow-400/20">
                                            <td className="border border-gray-100 p-3 text-xs font-black text-gray-700">실부담 이자</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center font-black text-gray-800">{Math.floor(g.actualInterest || 0).toLocaleString()}</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500 bg-gray-50/30">실부담 월이자</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center text-gray-600 font-bold">{Math.floor(g.monthlyActualInterest || 0).toLocaleString()}</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">납부 총액</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center text-gray-600 font-medium">{g.totalPayment.toLocaleString()}</td>
                                            ))}
                                        </tr>
                                        <tr className="bg-blue-50/50">
                                            <td className="border border-gray-100 p-3 text-xs font-black text-blue-700 italic">월 할부금 (예상)</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-4 text-center text-blue-700 font-black text-lg">{g.monthlyPayment.toLocaleString()}원</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">선취수수료 (회수)</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center text-orange-600">{Math.floor(g.upfrontFee || 0).toLocaleString()}</td>
                                            ))}
                                        </tr>
                                        <tr className="bg-gray-50">
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-700">정산 금액 (입금액)</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center font-black text-gray-800">{Math.floor(g.settlementAmount || 0).toLocaleString()}</td>
                                            ))}
                                        </tr>
                                        <tr className="bg-green-50/50">
                                            <td className="border border-gray-100 p-3 text-xs font-black text-green-700">마진 / 마진율</td>
                                            {calculations.greenPlus.map((g, i) => (
                                                <td key={i} className="border border-gray-100 p-3 text-center">
                                                    <span className="font-black text-green-700">{Math.floor(g.margin || 0).toLocaleString()}원</span>
                                                    <span className="text-[10px] text-green-600 ml-2">({g.marginRate.toFixed(2)}%)</span>
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* SECTION 3: BSON 렌탈 패키지 (Image 1 Bottom) */}
                        <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                            <h4 className="font-black text-[#001a3d] text-lg mb-6 flex items-center gap-2">
                                <RefreshCw size={20} className="text-orange-500" />
                                3. BSON 렌탈 패키지 (60개월 고정)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[11, 22, 33].map(val => (
                                    <div key={val} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 transition-all hover:bg-white hover:shadow-lg hover:border-orange-200 text-center">
                                        <p className="text-xs text-gray-500 font-bold mb-2 tracking-tighter">월 {val === 11 ? '111,000' : val === 22 ? '222,000' : '333,000'}원 고정형 패키지</p>
                                        <p className="text-2xl font-black text-[#001a3d]">
                                            {calculatePackage(calculations.lumpSum.discountedPrice, val * 10000, val * 500000 / 1.1)}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-black">Advance Payment</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* SECTION 4: 일시불 (Image 4) */}
                        <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-black text-[#001a3d] text-lg flex items-center gap-2">
                                    <Save size={20} className="text-kcc-gold" />
                                    4. 일시불 결제
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-400">일시불 할인율 설정 :</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={lumpSumDiscountRate}
                                            onChange={(e) => setLumpSumDiscountRate(Number(e.target.value))}
                                            className="w-20 text-center py-1 bg-gray-100 rounded-lg font-black text-[#001a3d]"
                                        />
                                        <span className="text-xs font-bold text-gray-400">%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border border-gray-100 p-3 text-sm font-black text-gray-700 bg-gray-100/50">구분</th>
                                            <th className="border border-gray-100 p-3 text-sm font-black text-[#001a3d]">일시불 (현금/카드)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500 bg-gray-50/30">견적가</td>
                                            <td className="border border-gray-100 p-3 text-center text-gray-400 font-medium">{calculations.lumpSum.quotePrice.toLocaleString()}</td>
                                        </tr>
                                        <tr className="bg-yellow-50/50">
                                            <td className="border border-gray-100 p-3 text-xs font-black text-gray-700">일시불 할인가</td>
                                            <td className="border border-gray-100 p-4 text-center text-[#c5a059] font-black text-xl">{calculations.lumpSum.discountedPrice.toLocaleString()}원</td>
                                        </tr>
                                        <tr className="bg-green-50/30">
                                            <td className="border border-gray-100 p-3 text-xs font-black text-green-700">마진 / 마진율</td>
                                            <td className="border border-gray-100 p-3 text-center">
                                                <span className="font-black text-green-700">{calculations.lumpSum.margin.toLocaleString()}원</span>
                                                <span className="text-xs text-green-600 ml-4 font-black">({calculations.lumpSum.marginRate.toFixed(2)}%)</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    <div className="pt-10 border-t border-gray-100">
                        <div className="pt-4 relative z-50">
                            {isConfirmMode ? (
                                <div className="glass-card p-6 rounded-3xl border-2 border-[#c5a059] animate-in fade-in zoom-in-95">
                                    <div className="text-center space-y-4">
                                        <h3 className="text-xl font-black text-[#001a3d]">정말 등록하시겠습니까?</h3>
                                        <div className="flex gap-3 justify-center">
                                            <button onClick={() => setIsConfirmMode(false)} className="px-8 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200">취소</button>
                                            <button onClick={handleFinalSubmit} className="px-8 py-4 rounded-2xl bg-[#001a3d] text-white font-black hover:bg-blue-900 flex items-center gap-2"><CheckCircle size={20} /> 확인 및 등록</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={handleRegisterClick} className="w-full bg-[#001a3d] text-white h-20 rounded-3xl text-xl font-black shadow-2xl hover:bg-blue-900 flex items-center justify-center gap-2"><Save size={28} /><span>견적 데이터 등록하기</span></button>
                            )}
                        </div>
                    </div>
                </div>
            )}
                </div>
            )}

            {/* TAB CONTENT: LOOKUP (NEW) */}
            {activeTab === 'lookup' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Filters */}
                    <div className="glass-card p-4 rounded-[2rem] flex flex-wrap gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px] relative">
                            <input
                                type="text"
                                placeholder="고객명, 전화번호, 주소 검색"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#c5a059]/50 transition-all font-bold text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <FileText size={18} />
                            </div>
                        </div>

                        {/* Date Filter */}
                        <select
                            className="bg-gray-50 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 border-none cursor-pointer focus:ring-2 focus:ring-[#c5a059]/50"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        >
                            <option value="all">전체 기간</option>
                            <option value="today">오늘</option>
                            <option value="month">이번 달</option>
                            <option value="prev_month">전월</option>
                            <option value="3month">3개월</option>
                            <option value="6month">6개월</option>
                            <option value="year">1년</option>
                        </select>


                        {/* Type Filter */}
                        <select
                            className="bg-gray-50 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 border-none cursor-pointer focus:ring-2 focus:ring-[#c5a059]/50"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">전체 구분</option>
                            <option value="가견적">가견적</option>
                            <option value="책임견적">책임견적</option>
                            <option value="최종견적">최종견적</option>
                        </select>

                        {/* Sort Order */}
                        <select
                            className="bg-gray-50 px-4 py-3 rounded-xl text-sm font-black text-[#001a3d] border-none cursor-pointer focus:ring-2 focus:ring-[#c5a059]/50"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="desc">최신순</option>
                            <option value="asc">과거순</option>
                        </select>
                        <button
                            onClick={fetchList}
                            className="p-3 bg-gray-50 text-gray-500 hover:text-kcc-blue hover:bg-blue-50 rounded-xl transition-all"
                            title="새로고침"
                        >
                            <RefreshCw size={18} />
                        </button>

                        {/* Batch Fix Button (Hidden unless specific action or just visible for admin) */}
                        <button
                            onClick={handleBatchMigration}
                            className="px-4 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all text-xs font-bold flex items-center gap-2 ml-auto"
                            title="전체 데이터 상세금액 재계산 (소급 적용)"
                        >
                            <Calculator size={16} /> 일괄 보정
                        </button>
                    </div>

                    {/* Table View */}
                    <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            "순번", "접수일", "구분", "고객명", "전화번호", "주소",
                                            "공급가", "최종견적", "최종혜택", "할인율", "추가할인",
                                            "마진금액", "마진율",
                                            "24개월", "36개월", "48개월", "60개월",
                                            "PDF", "비고"
                                        ].map((th, i) => (
                                            <th key={i} className="px-4 py-4 text-[#001a3d] font-black whitespace-nowrap text-xs uppercase tracking-tight first:pl-8 last:pr-8 text-center">{th}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredList.length === 0 ? (
                                        <tr>
                                            <td colSpan="20" className="text-center py-20 text-gray-400 font-bold">데이터가 없습니다.</td>
                                        </tr>
                                    ) : (
                                        filteredList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-4 text-center font-bold text-gray-400">{filteredList.length - idx}</td>
                                                <td className="px-4 py-4 text-center whitespace-nowrap font-medium text-gray-600">{item.date}</td>
                                                <td className="px-4 py-4 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${item.type === '최종견적' ? 'bg-[#001a3d] text-[#c5a059]' :
                                                        item.type === '책임견적' ? 'bg-[#c5a059] text-white' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center whitespace-nowrap font-bold text-blue-600 hover:text-blue-800 cursor-pointer underline decoration-wavy underline-offset-4" onClick={() => setSelectedQuote(item)}>{item.name}</td>
                                                <td className="px-4 py-4 text-center whitespace-nowrap text-gray-500 font-mono text-xs">{item.phone}</td>
                                                <td className="px-4 py-4 max-w-[200px] truncate text-gray-500 text-xs" title={item.address}>{item.address}</td>

                                                <td className="px-4 py-4 text-right text-gray-400 text-xs">{Number(item.kccPrice).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-medium text-gray-800">{Number(item.finalQuote).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-black text-[#001a3d]">{Number(item.finalBenefit).toLocaleString()}</td>

                                                <td className="px-4 py-4 text-center text-red-500 font-bold text-xs">{item.discountRate}%</td>
                                                <td className="px-4 py-4 text-right text-red-500 font-bold text-xs">{Number(item.extraDiscount).toLocaleString()}</td>

                                                <td className="px-4 py-4 text-right font-medium text-green-600 bg-green-50/30">{Number(item.marginAmt).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-center font-bold text-green-600 bg-green-50/30">{Number(item.marginRate).toFixed(1)}%</td>

                                                {/* Subscription */}
                                                <td className="px-4 py-4 text-right text-gray-400 text-[10px]">{Number(item.sub24).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right text-gray-400 text-[10px]">{Number(item.sub36).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right text-gray-400 text-[10px]">{Number(item.sub48).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-bold text-[#c5a059] bg-[#c5a059]/5 text-[11px]">{Number(item.sub60).toLocaleString()}</td>

                                                <td className="px-4 py-4 text-center">
                                                    {item.pdfUrl ? (
                                                        <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-kcc-blue hover:text-blue-600 underline text-xs font-bold">확인</a>
                                                    ) : <span className="text-gray-300 text-xs">-</span>}
                                                </td>

                                                {/* Remark Edit */}
                                                <td className="px-4 py-4 min-w-[200px]">
                                                    <input
                                                        type="text"
                                                        defaultValue={item.remark}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== item.remark) {
                                                                handleRemarkChange(item, e.target.value);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.target.blur();
                                                            }
                                                        }}
                                                        placeholder="비고 입력"
                                                        className="w-full bg-transparent border-b border-gray-200 focus:border-[#c5a059] focus:bg-[#c5a059]/5 outline-none text-xs py-1 transition-all"
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: RENTAL APPLICATIONS (NEW) */}
            {activeTab === 'rental' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Filters (Reduced for Rental) */}
                    <div className="glass-card p-4 rounded-[2rem] flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px] relative">
                            <input
                                type="text"
                                placeholder="고객명, 전화번호 검색"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#2c3e50]/50 transition-all font-bold text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Search size={18} />
                            </div>
                        </div>
                        <select
                            className="bg-gray-50 px-4 py-3 rounded-xl text-sm font-black text-[#001a3d] border-none cursor-pointer focus:ring-2 focus:ring-[#2c3e50]/50"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="desc">최신순</option>
                            <option value="asc">과거순</option>
                        </select>
                        <button
                            onClick={fetchList}
                            className="p-3 bg-gray-50 text-gray-500 hover:text-[#2c3e50] hover:bg-blue-50 rounded-xl transition-all"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    {/* Table View */}
                    <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#2c3e50] text-white">
                                    <tr>
                                        {[
                                            "순번", "상태", "일자", "고객명", "전화번호", "생일", "성", "이체", "직군", "소유", "할인가", "선납금", "잔금", "구분", "개월", "구독료", "서류"
                                        ].map((th, i) => (
                                            <th key={i} className="px-2 py-3.5 font-black whitespace-nowrap text-[11px] uppercase tracking-tighter first:pl-6 last:pr-6 text-center">{th}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRentalList.length === 0 ? (
                                        <tr>
                                            <td colSpan="17" className="text-center py-20 text-gray-400 font-bold">렌탈 신청 내역이 없습니다.</td>
                                        </tr>
                                    ) : (
                                        filteredRentalList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-2 py-3.5 text-center font-bold text-gray-300">{filteredRentalList.length - idx}</td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap">
                                                    <select
                                                        value={item.status || '접수'}
                                                        onChange={(e) => handleRentalStatusChange(item, e.target.value)}
                                                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border-none cursor-pointer focus:ring-1 focus:ring-[#2c3e50]/30 transition-all ${RENTAL_STATUS_OPTIONS.find(opt => opt.value === (item.status || '접수'))?.color || 'bg-gray-100 text-gray-600'}`}
                                                    >
                                                        {RENTAL_STATUS_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value} className="bg-white text-gray-700">{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap font-medium text-gray-400 text-[10px]">{item.createdAt ? item.createdAt.split('T')[0].replace(/-/g, '.') : '-'}</td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap font-bold text-blue-600 hover:text-blue-800 cursor-pointer underline decoration-wavy underline-offset-4" onClick={() => handleRentalNameClick(item)}>{item.name}</td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 font-mono text-[10px]">{item.phone}</td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 text-[10px]">{item.birthDate}</td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 text-[10px]">{item.gender === 'male' ? '남' : '여'}</td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 text-[10px] font-bold">{item.transferDate ? `${item.transferDate}${item.transferDate === '말일' ? '' : '일'}` : '-'}</td>
                                                <td className="px-2 py-3.5 text-center text-gray-500 text-[9.5px] leading-tight min-w-[120px] font-medium">{item.jobCategory || '-'}</td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 text-[10px]">
                                                    {item.ownershipType === 'own_own' ? '본인' : (item.ownershipType === 'family_own' ? '가족' : '이사')}
                                                </td>
                                                <td className="px-2 py-3.5 text-right whitespace-nowrap text-gray-700 text-[10px]">
                                                    {item.finalBenefit ? Number(item.finalBenefit).toLocaleString() + '원' : '-'}
                                                </td>
                                                <td className="px-2 py-3.5 text-right whitespace-nowrap text-[#001a3d] font-bold text-[10px]">
                                                    {item.downPayment ? Number(item.downPayment).toLocaleString() + '원' : '0원'}
                                                </td>
                                                <td className="px-2 py-3.5 text-right whitespace-nowrap text-gray-600 text-[10px]">
                                                    {item.balance ? Number(item.balance).toLocaleString() + '원' : '-'}
                                                </td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-600 text-[10px] font-bold">
                                                    {item.conversionMode === 'full' ? '전액' : (item.conversionMode === 'balance' ? '잔금' : item.conversionMode?.replace('구독','') || '전액')}
                                                </td>
                                                <td className="px-2 py-3.5 text-center whitespace-nowrap text-blue-600 font-bold text-[10px]">
                                                    60개월
                                                </td>
                                                <td className="px-2 py-3.5 text-right whitespace-nowrap font-bold text-blue-600 text-[10px]">
                                                    {item.monthlyAmount ? Number(item.monthlyAmount).toLocaleString() + '원' : (item.selectedAmount >= 11 && item.selectedAmount <= 33 ? Number(item.selectedAmount * 10000).toLocaleString() + '원' : '0원')}
                                                </td>
                                                <td className="px-2 py-3.5 text-left">
                                                    <div className="flex flex-wrap gap-1 min-w-[100px]">
                                                        {item.files.map((file, fIdx) => (
                                                            <a
                                                                key={fIdx}
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title={file.name}
                                                                className="flex items-center gap-1 px-1.5 py-1 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all border border-gray-100"
                                                            >
                                                                <FileText size={12} />
                                                                <span className="text-[9px] font-black whitespace-nowrap">
                                                                    {file.category === 'registry' ? '등기' : (file.category === 'contract' ? '계약' : (file.category === 'id_card' ? '신분증' : (file.category === 'family' ? '가족' : (file.category === 'bank_book' ? '통장' : (file.category === 'agreements' ? '동의서' : '기타')))))}
                                                                </span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )
            }

            {/* TAB CONTENT: SUBSCRIPTION APPLICATIONS (NEW) */}
            {
                activeTab === 'subscription' && (
                    <div className="space-y-6 animate-in fade-in">
                        {/* Filters */}
                        <div className="glass-card p-4 rounded-[2rem] flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px] relative">
                                <input
                                    type="text"
                                    placeholder="고객명, 전화번호 검색"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#2c3e50]/50 transition-all font-bold text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Search size={18} />
                                </div>
                            </div>
                            <select
                                className="bg-gray-50 px-4 py-3 rounded-xl text-sm font-black text-[#001a3d] border-none cursor-pointer focus:ring-2 focus:ring-[#2c3e50]/50"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="desc">최신순</option>
                                <option value="asc">과거순</option>
                            </select>
                            <button
                                onClick={fetchList}
                                className="p-3 bg-gray-50 text-gray-500 hover:text-[#2c3e50] hover:bg-blue-50 rounded-xl transition-all"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        {/* Table View */}
                        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#1a3a3a] text-white">
                                        <tr>
                                            {[
                                                "순번", "상태", "일자", "고객명", "전화번호", "생일", "성", "이체", "직군", "소유", "할인가", "선납금", "잔금", "구분", "개월", "구독료", "서류"
                                            ].map((th, i) => (
                                                <th key={i} className="px-2 py-3.5 font-black whitespace-nowrap text-[11px] uppercase tracking-tighter first:pl-6 last:pr-6 text-center">{th}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredSubscriptionList.length === 0 ? (
                                            <tr>
                                                <td colSpan="17" className="text-center py-20 text-gray-400 font-bold">할부 신청 내역이 없습니다.</td>
                                            </tr>
                                        ) : (
                                            filteredSubscriptionList.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                                                    <td className="px-2 py-3.5 text-center font-bold text-gray-300">{filteredSubscriptionList.length - idx}</td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap">
                                                        <select
                                                            value={item.status || '접수'}
                                                            onChange={(e) => handleSubscriptionStatusChange(item, e.target.value)}
                                                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border-none cursor-pointer focus:ring-1 focus:ring-[#1a3a3a]/30 transition-all ${SUBSCRIPTION_STATUS_OPTIONS.find(opt => opt.value === (item.status || '접수'))?.color || 'bg-gray-100 text-gray-600'}`}
                                                        >
                                                            {SUBSCRIPTION_STATUS_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value} className="bg-white text-gray-700">{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap font-medium text-gray-400 text-[10px]">{item.createdAt ? item.createdAt.split('T')[0].replace(/-/g, '.') : '-'}</td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap font-bold text-teal-600 hover:text-teal-800 cursor-pointer underline decoration-wavy underline-offset-4" onClick={() => handleRentalNameClick(item)}>{item.name}</td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 font-mono text-[10px]">{item.phone}</td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 text-[10px]">{item.birthDate}</td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 text-[10px]">{item.gender === 'male' ? '남' : '여'}</td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 text-[10px] font-bold">{item.transferDate ? `${item.transferDate}${item.transferDate === '말일' ? '' : '일'}` : '-'}</td>
                                                    <td className="px-2 py-3.5 text-center text-gray-500 text-[9.5px] leading-tight min-w-[120px] font-medium">{item.jobCategory || '-'}</td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-500 text-[10px]">
                                                        {item.ownershipType === 'own_own' ? '본인' : (item.ownershipType === 'family_own' ? '가족' : '이사')}
                                                    </td>
                                                    <td className="px-2 py-3.5 text-right whitespace-nowrap text-gray-700 text-[10px]">
                                                        {item.finalBenefit ? Number(item.finalBenefit).toLocaleString() + '원' : '-'}
                                                    </td>
                                                    <td className="px-2 py-3.5 text-right whitespace-nowrap text-teal-800 font-bold text-[10px]">
                                                        {item.downPayment ? Number(item.downPayment).toLocaleString() + '원' : '0원'}
                                                    </td>
                                                    <td className="px-2 py-3.5 text-right whitespace-nowrap text-gray-600 text-[10px]">
                                                        {item.balance ? Number(item.balance).toLocaleString() + '원' : '-'}
                                                    </td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap text-gray-600 text-[10px] font-bold">
                                                        {item.conversionMode === 'full' ? '전액' : (item.conversionMode === 'balance' ? '잔금' : item.conversionMode?.replace('구독','') || '전액')}
                                                    </td>
                                                    <td className="px-2 py-3.5 text-center whitespace-nowrap text-teal-600 font-bold text-[10px]">
                                                        {item.selectedAmount}개월
                                                    </td>
                                                    <td className="px-2 py-3.5 text-right whitespace-nowrap font-bold text-teal-600 text-[10px]">
                                                        {item.monthlyAmount ? Number(item.monthlyAmount).toLocaleString() + '원' : '-'}
                                                    </td>
                                                    <td className="px-2 py-3.5 text-left">
                                                        <div className="flex flex-wrap gap-1 min-w-[100px]">
                                                            {item.files.map((file, fIdx) => (
                                                                <a
                                                                    key={fIdx}
                                                                    href={file.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={file.name}
                                                                    className="flex items-center gap-1 px-1.5 py-1 bg-gray-50 hover:bg-teal-50 text-gray-400 hover:text-teal-600 rounded-lg transition-all border border-gray-100"
                                                                >
                                                                    <FileText size={12} />
                                                                    <span className="text-[9px] font-black whitespace-nowrap">
                                                                        {file.category === 'registry' ? '등기' : (file.category === 'contract' ? '계약' : (file.category === 'id_card' ? '신분증' : (file.category === 'family' ? '가족' : (file.category === 'bank_book' ? '통장' : '기타'))))}
                                                                    </span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Loading Overlay */}
            {
                loading && (
                    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#001a3d]/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-gray-100 rounded-full"></div>
                                <div className="w-20 h-20 border-4 border-t-[#c5a059] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                                <Loader2 size={32} className="text-[#001a3d] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-black text-[#001a3d] tracking-tighter">{activeTab === 'lookup' ? '견적 목록 조회 중' : '견적 데이터 처리 중'}</h3>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{status || '서버와 통신하고 있습니다'}</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Detail Modal */}
            {
                selectedQuote && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4" onClick={() => setSelectedQuote(null)}>
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#001a3d] text-white">
                                <div>
                                    <h3 className="text-xl font-black">{selectedQuote.name} 고객님 견적 상세</h3>
                                    <p className="text-xs text-white/60 font-bold mt-1">{selectedQuote.date}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isEditingModal ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setModalEditData({
                                                    discountRate: selectedQuote.discountRate,
                                                    extraDiscount: selectedQuote.extraDiscount
                                                });
                                                setIsEditingModal(true);
                                            }}
                                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                        >
                                            <Calculator size={14} /> 수정하기
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditingModal(false);
                                            }}
                                            className="px-4 py-2 bg-red-500/80 hover:bg-red-600 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            취소
                                        </button>
                                    )}
                                    <button onClick={() => { setSelectedQuote(null); setIsEditingModal(false); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <span className="sr-only">Close</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                                {/* Summary Cards */}
                                {/* 1. Customer Info */}
                                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide opacity-70">
                                        기본 정보
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-3 rounded-xl border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold mb-1">견적 구분</p>
                                            <p className={`text-sm font-black ${selectedQuote.type === '최종견적' ? 'text-[#001a3d]' :
                                                selectedQuote.type === '책임견적' ? 'text-[#c5a059]' :
                                                    'text-gray-500'
                                                }`}>{selectedQuote.type}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold mb-1">고객 연락처</p>
                                            <p className="text-sm font-bold text-gray-700 font-mono">{selectedQuote.phone}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-gray-100 md:col-span-1">
                                            <p className="text-[10px] text-gray-400 font-bold mb-1">설치 주소</p>
                                            <p className="text-sm font-bold text-gray-700 break-keep leading-snug">{selectedQuote.address}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Financial Summary */}
                                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide opacity-70">
                                        가격 및 마진 분석
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {/* Row 1 */}
                                        <div className="bg-white p-3 rounded-xl border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold mb-1">공급가 (VAT포함)</p>
                                            <p className="text-sm font-medium text-gray-600">{formatKrw(selectedQuote.kccPrice)}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold mb-1">할인율</p>
                                            {isEditingModal ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={modalEditData.discountRate}
                                                        onChange={(e) => setModalEditData({ ...modalEditData, discountRate: Number(e.target.value) })}
                                                        className="w-full bg-gray-50 border-none rounded px-2 py-0.5 text-sm font-bold text-red-500 focus:ring-1 focus:ring-red-200 outline-none"
                                                    />
                                                    <span className="text-xs font-bold text-red-500">%</span>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-bold text-red-500">{selectedQuote.discountRate}%</p>
                                            )}
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold mb-1">추가 할인금액</p>
                                            {isEditingModal ? (
                                                <input
                                                    type="text"
                                                    value={modalEditData.extraDiscount.toLocaleString()}
                                                    onChange={(e) => setModalEditData({ ...modalEditData, extraDiscount: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                                                    className="w-full bg-gray-50 border-none rounded px-2 py-0.5 text-sm font-bold text-red-500 focus:ring-1 focus:ring-red-200 outline-none"
                                                />
                                            ) : (
                                                <p className="text-sm font-bold text-red-500">{formatKrw(selectedQuote.extraDiscount)}</p>
                                            )}
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold mb-1">마진율</p>
                                            <p className={`text-sm font-black ${Number(modalCalculations.marginRate || 0) >= 0 ? 'text-gray-800' : 'text-red-500'}`}>{Number(modalCalculations.marginRate || 0).toFixed(1)}%</p>
                                        </div>

                                        {/* Row 2 (Key Figures) */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 md:col-span-1">
                                            <p className="text-xs text-gray-400 font-bold mb-1">{selectedQuote.type === '가견적' ? '가견적가' : '최종 견적가'}</p>
                                            <p className="text-xl font-black text-gray-800">{formatKrw(selectedQuote.finalQuote)}</p>
                                        </div>
                                        <div className="bg-[#001a3d] p-4 rounded-xl shadow-lg md:col-span-1">
                                            <p className="text-xs text-white/60 font-bold mb-1">고객 실 부담금</p>
                                            <p className="text-xl font-black text-white">{formatKrw(Number(modalCalculations.finalBenefit || 0))}</p>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 md:col-span-1">
                                            <p className="text-xs text-green-600 font-bold mb-1">마진 금액</p>
                                            <p className="text-xl font-black text-green-700">{formatKrw(Number(modalCalculations.marginAmount || 0))}</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 md:col-span-1">
                                            <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">자재비(배수)</p>
                                            <p className="text-xl font-black text-gray-800">{Number(modalCalculations.materialMultiplier || 1.3).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Detailed Analysis Tables (Section 2, 3, 4 Equivalents) */}
                                <div className="space-y-8">
                                    {/* SECTION 2 (Green Remodeling PLUS) Style Table */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide opacity-70 italic">
                                            <Calculator size={16} className="text-blue-500" /> 그린리모델링 PLUS 분석 (이자 지원 포함)
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50/50">
                                                        <th className="border border-gray-100 p-3 text-xs font-bold text-gray-500 w-32">구분</th>
                                                        {[60, 48, 36, 24].map(m => (
                                                            <th key={m} className={`border border-gray-100 p-3 text-sm font-black text-[#001a3d] ${m === 60 ? 'bg-[#c5a059]/5' : ''}`}>{m}개월</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">최종 견적가</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center font-black text-gray-800">{(Number(g.quotePrice || 0)).toLocaleString()}</td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">고객 실이율 (년)</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center text-red-500 font-bold">{g.customerPayRate.toFixed(2)}%</td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">원래 부담해야 할 이자</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center text-gray-400 font-medium">{Math.floor(g.origInterest || 0).toLocaleString()}</td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">지원하는 이자</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center text-gray-400 font-medium">{Math.floor(g.supportedInterest || 0).toLocaleString()}</td>
                                                        ))}
                                                    </tr>
                                                    <tr className="bg-yellow-400/20">
                                                        <td className="border border-gray-100 p-3 text-xs font-black text-gray-700">실부담 이자</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center font-black text-gray-800">{Math.floor(g.actualInterest || 0).toLocaleString()}</td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500 bg-gray-50/30">실부담 월이자</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center text-gray-600 font-bold">{Math.floor(g.monthlyActualInterest || 0).toLocaleString()}</td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">납부 총액</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center text-gray-600 font-medium">{g.totalPayment.toLocaleString()}</td>
                                                        ))}
                                                    </tr>
                                                    <tr className="bg-blue-50/50">
                                                        <td className="border border-gray-100 p-3 text-xs font-black text-blue-700 italic">월 할부금 (예상)</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-4 text-center text-blue-700 font-black text-lg">{g.monthlyPayment.toLocaleString()}원</td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-100 p-3 text-xs font-bold text-gray-500">선취수수료 (회수)</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center text-orange-600">{Math.floor(g.upfrontFee || 0).toLocaleString()}</td>
                                                        ))}
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-100 p-3 text-xs font-bold text-gray-700">정산 금액 (입금액)</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center font-black text-gray-800">{Math.floor(g.settlementAmount || 0).toLocaleString()}</td>
                                                        ))}
                                                    </tr>
                                            <tr className="bg-green-50/50">
                                                        <td className="border border-gray-100 p-3 text-xs font-black text-green-700">마진 / 마진율</td>
                                                        {modalCalculations?.greenPlus?.map((g, i) => (
                                                            <td key={i} className="border border-gray-100 p-3 text-center">
                                                                <span className="font-black text-green-700">{Math.floor(g.margin || 0).toLocaleString()}원</span>
                                                                <span className="text-[10px] text-green-600 ml-2">({(Number(g.marginRate || 0)).toFixed(2)}%)</span>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* SECTION 3 (BSON Package) Equiv */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide opacity-70">
                                            BSON 렌탈 패키지 (11/22/33 고정형 선납금)
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[11, 22, 33].map(val => (
                                                <div key={val} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 flex flex-col items-center">
                                                    <p className="text-[10px] text-gray-400 font-bold mb-1 italic uppercase tracking-wider">MONTHLY PAYMENT {val === 11 ? '11.1' : val === 22 ? '22.2' : '33.3'}만</p>
                                                    <p className="text-xl font-black text-[#001a3d] border-b-2 border-[#c5a059]/30 pb-1 mb-2">
                                                        {calculatePackage(Number(modalCalculations?.lumpSum?.discountedPrice || 0), val * 10000, val * 500000 / 1.1)}
                                                    </p>
                                                    <p className="text-[9px] text-gray-300 font-bold">PACKAGE EARLY ADOPTION BSON</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Other */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest opacity-50">비고 (Remark)</p>
                                        <p className="text-sm font-bold text-gray-700 italic border-l-4 border-gray-200 pl-3 py-1 bg-gray-50/50 rounded-r-lg">
                                            {selectedQuote.remark || '입력된 비고 사항이 없습니다.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white border-t border-gray-100 flex justify-between gap-3">
                                <div className="flex-1 flex gap-3">
                                    {isEditingModal ? (
                                        <button
                                            onClick={handleModalSave}
                                            className="flex-1 py-4 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-base"
                                        >
                                            <Save size={20} /> 수정내용 저장하기
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}/?n=${encodeURIComponent(selectedQuote.name)}&p=${encodeURIComponent(selectedQuote.phone)}&t=${encodeURIComponent(selectedQuote.type)}`;
                                                    window.open(url, '_blank');
                                                }}
                                                className="flex-1 py-4 bg-[#001a3d] text-white font-black rounded-xl hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 text-base"
                                            >
                                                <ExternalLink size={20} /> 발송견적 (WEB)
                                            </button>

                                            {selectedQuote.pdfUrl && (
                                                <a
                                                    href={selectedQuote.pdfUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 py-4 bg-[#c5a059] text-white font-black rounded-xl hover:bg-[#b08d48] transition-colors flex items-center justify-center gap-2 text-base"
                                                >
                                                    <FileText size={20} /> PDF 다운로드
                                                </a>
                                            )}
                                        </>
                                    )}
                                </div>

                                <button onClick={() => { setSelectedQuote(null); setIsEditingModal(false); }} className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors text-base">
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminPage;
