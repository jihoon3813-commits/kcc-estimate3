import React, { useState } from 'react';
import { Search, User, Phone, MapPin, Download, Gift, ShieldCheck, ChevronRight, MessageCircle, ExternalLink, X, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { searchQuote } from '../lib/api';

const CustomerPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [data, setData] = useState(null);
    const [banners, setBanners] = useState([]);
    const [modalType, setModalType] = useState(null); // 'A' or 'B'
    const [appliances, setAppliances] = useState({ A: [], B: [] });
    const [loading, setLoading] = useState(false);

    const [searchForm, setSearchForm] = useState({ name: '', phone: '' });

    const [statusType, setStatusType] = useState('가견적'); // Default to final quote
    const [showContactMenu, setShowContactMenu] = useState(false);

    // Lock body scroll when modal is open

    React.useEffect(() => {
        if (modalType) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [modalType]);

    // Helper for phone formatting
    const formatPhoneNumber = (value) => {
        if (!value) return value;
        const raw = value.replace(/[^\d]/g, '');
        if (raw.length < 4) return raw;
        if (raw.length < 8) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
        return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    };

    const handlePhoneChange = (e) => {
        const formatted = formatPhoneNumber(e.target.value);
        setSearchForm(prev => ({ ...prev, phone: formatted }));
    };

    const executeSearch = async (nameVal, phoneVal, typeVal) => {
        setLoading(true);
        try {
            const result = await searchQuote(nameVal, phoneVal, typeVal);

            if (result.success) {
                setData(result.data);
                if (result.config?.banners) {
                    setBanners(result.config.banners);
                }

                if (result.config?.appliances) {
                    // GAS returns { A: [], B: [] } object, not an array
                    setAppliances(result.config.appliances);
                } else {
                    setAppliances({
                        A: [
                            { type: 'A', cat: 'TV', img: 'https://cdn.imweb.me/thumbnail/20260109/d7e86b0ff1338.jpg', name: 'LG 울트라 HD TV 65인치', model: '65UT931C', link: '#' },
                            { type: 'A', cat: 'TV', img: 'https://cdn.imweb.me/thumbnail/20260109/1c793fead763f.jpg', name: 'LG 스탠바이미2 27인치', model: '27LX6TPGA', link: '#' },
                        ],
                        B: [
                            { type: 'B', cat: 'TV', img: 'https://cdn.imweb.me/thumbnail/20260109/9622343b2f19a.jpg', name: 'LG 울트라 HD TV 75인치', model: '75UT931C', link: '#' },
                        ]
                    });
                }
                setIsLoggedIn(true);
            } else {
                alert(result.message || "조회 실패: 정보를 다시 확인해주세요.");
            }
        } catch (error) {
            console.error("Search error:", error);
            alert("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-Search Effect
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const n = params.get('n');
        const p = params.get('p');
        const t = params.get('t'); // '가견적' or '최종견적'

        if (n && p) {
            // Decoding might be needed if strictly encoded, but params.get handles most
            const nameDec = decodeURIComponent(n);
            const phoneDec = decodeURIComponent(p);
            const typeDec = t ? decodeURIComponent(t) : '가견적';

            setSearchForm({ name: nameDec, phone: phoneDec });
            setStatusType(typeDec);
            executeSearch(nameDec, phoneDec, typeDec);
        }
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        executeSearch(searchForm.name, searchForm.phone, statusType);
    };

    const formatKrw = (val) => new Intl.NumberFormat('ko-KR').format(val || 0) + '원';

    const calculatePackage = (basePrice, rentalMonthly, subtractAmount) => {
        const advancePayment = (basePrice || 0) - (subtractAmount || 0);
        return advancePayment < 0 ? "해당없음" : formatKrw(advancePayment);
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#001a3d] relative overflow-hidden text-sm">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#001a3d] to-[#003366] opacity-90"></div>

                <div className="w-full max-w-[420px] bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/20">
                    <div className="text-center mb-8 space-y-4">
                        <div className="flex justify-center mb-4">
                            <img src="https://cdn.imweb.me/upload/S20250904697320f4fd9ed/e840c9a46f66a.png" alt="KCC Logo" className="h-10 object-contain" />
                        </div>
                        <h1 className="text-lg font-extrabold text-white tracking-tight leading-tight">
                            프리미엄 견적 시스템
                        </h1>
                        <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">이름과 전화번호를 입력해주세요</p>
                    </div>

                    <form onSubmit={handleSearch} className="space-y-4">
                        {/* Status Type Selector */}
                        <div className="grid grid-cols-2 gap-2 mb-4 bg-black/20 p-1 rounded-xl">
                            {['가견적', '최종견적'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setStatusType(type)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${statusType === type
                                        ? 'bg-[#c5a059] text-white shadow-md'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1">
                            <label className="text-white/50 text-[9px] font-bold uppercase tracking-widest ml-1">성함</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                                <input
                                    type="text"
                                    required
                                    placeholder="성함을 입력하세요"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:bg-white/10 outline-none transition-all font-semibold"
                                    value={searchForm.name}
                                    onChange={(e) => setSearchForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-white/50 text-[9px] font-bold uppercase tracking-widest ml-1">연락처</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    required
                                    placeholder="연락처를 입력하세요"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:bg-white/10 outline-none transition-all font-semibold"
                                    value={searchForm.phone}
                                    onChange={handlePhoneChange}
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-[#c5a059] text-white text-xs font-black py-4 rounded-2xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 uppercase disabled:opacity-50">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {loading ? '조회 중...' : '조회 결과 확인하기'}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-white/10 pt-4">
                        <p className="text-white/40 text-[10px] font-bold">(주)티유디지털 | 공식파트너</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return <div className="min-h-screen flex items-center justify-center text-[#001a3d] font-bold text-xs uppercase tracking-widest">Loading Premium Data...</div>;

    return (
        <div className="bg-[#f7f9fc] min-h-screen pb-16 font-sans selection:bg-[#c5a059]/30 text-sm">
            <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-5 py-3.5 flex justify-between items-center">
                    <img src="https://cdn.imweb.me/upload/S20250904697320f4fd9ed/5b115594e9a66.png" alt="KCC Logo" className="h-6 object-contain" />
                    <div className="flex items-center gap-1.5">
                        <span className="bg-red-500 text-white text-[9px] font-black px-2.5 py-1.5 rounded-md shadow-sm">
                            {data.status || '최종견적'}
                        </span>
                        <div className="bg-[#f0f4f9] text-[#2c3e50] text-[9px] font-black px-2.5 py-1.5 rounded-full border border-gray-200 flex items-center gap-1">
                            <Calendar size={10} />
                            견적일: <span className="font-outfit">{data.date}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
                <div className="text-center space-y-3 pt-4">
                    <div className="inline-block bg-[#001a3d]/5 px-3 py-1 rounded-full">
                        <span className="text-[#001a3d] text-[9px] font-black tracking-widest uppercase">OFFICIAL QUOTATION</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-[#001a3d] leading-tight tracking-tight">
                        <span className="text-luxury">감사합니다.</span> {data.name}님<br />
                        <span className="text-gray-300">최고의 가치로 보답하겠습니다.</span>
                    </h2>
                </div>

                <div className="luxury-card p-6 md:p-8 relative overflow-hidden bg-white shadow-xl shadow-gray-200/50">
                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[9px] font-black text-[#c5a059] uppercase tracking-widest mb-1.5">Customer details</p>
                                <h3 className="text-2xl font-black text-[#001a3d] leading-none">{data.name} 고객님</h3>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black shadow-sm ${data.status === '최종견적' ? 'bg-[#001a3d] text-[#c5a059] border border-[#c5a059]/30' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                                {data.status || '가견적'}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div className="w-9 h-9 bg-white shadow-sm rounded-xl flex items-center justify-center text-[#c5a059]"><MapPin size={18} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight mb-0.5">Address</p>
                                    <p className="text-xs font-extrabold text-[#2c3e50] break-keep">{data.address}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div className="w-9 h-9 bg-white shadow-sm rounded-xl flex items-center justify-center text-[#c5a059]"><Phone size={18} /></div>
                                <div>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight mb-0.5">Contact</p>
                                    <p className="text-xs font-extrabold text-[#2c3e50] font-outfit">{formatPhoneNumber(data.phone || searchForm.phone)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-black text-[#001a3d] flex items-center gap-2 px-1">
                        <div className="w-8 h-8 bg-[#001a3d] text-[#c5a059] rounded-lg flex items-center justify-center shadow-md"><ChevronRight size={18} /></div>
                        결제 방식별 상세 제안
                    </h3>

                    <div className="grid grid-cols-1 gap-6">
                        {/* 1. 일시불 섹션 */}
                        <div className="luxury-card overflow-hidden border-none shadow-xl">
                            <div className="bg-[#1a1c23] px-5 py-3.5 flex justify-between items-center text-white">
                                <div className="flex items-center gap-2.5 text-sm font-black">
                                    <div className="w-6 h-6 bg-white text-[#1a1c23] rounded-full flex items-center justify-center text-[10px] font-outfit">1</div>
                                    일시불 (현금/카드)
                                </div>
                                <span className="bg-[#facc15] text-[#1a1c23] text-[8px] font-black px-2.5 py-1 rounded shadow-sm uppercase">Best</span>
                            </div>
                            <div className="p-6 md:p-10 space-y-6 bg-white">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 font-bold">정상 견적금액 (상세항목 합계)</span>
                                    <span className="text-gray-400 font-bold text-base line-through font-outfit">{formatKrw(data.finalQuote)}</span>
                                </div>
                                <div className="bg-red-50 border border-red-100/50 px-4 py-3 rounded-2xl flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Gift size={16} className="text-red-500" />
                                        <span className="text-red-500 font-black text-xs">특별 프로모션 할인</span>
                                    </div>
                                    <span className="text-red-500 font-black text-base font-outfit">-{formatKrw(data.finalQuote - data.finalBenefit)}</span>
                                </div>
                                <div className="pt-6 border-t border-dashed border-gray-100 flex justify-between items-end">
                                    <span className="text-[#001a3d] font-black text-sm pb-1">최종 할인 혜택가</span>
                                    <div className="text-right">
                                        <span className="text-4xl font-black text-[#2563eb] tracking-tighter font-outfit">{formatKrw(data.finalBenefit).replace('원', '')}</span>
                                        <span className="text-xl font-black text-[#2563eb] ml-0.5">원</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. 스마트 구독 서비스 */}
                        <div className="premium-gradient p-8 md:p-10 text-white relative overflow-hidden shadow-xl shadow-[#001a3d]/10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-4xl"></div>
                            <div className="relative z-10 mb-8">
                                <h4 className="text-base font-black text-white flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-6 h-6 bg-white/20 text-white rounded-full flex items-center justify-center text-[10px] font-black border border-white/20 font-outfit">2</div>
                                        스마트 구독 서비스
                                    </div>
                                    <span className="text-[8px] text-[#c5a059] font-black uppercase tracking-widest border border-[#c5a059]/30 px-2.5 py-1 rounded-full bg-[#c5a059]/10">Subscription</span>
                                </h4>
                                <p className="text-white/60 text-[11px] font-medium ml-8">전체 시공비를 최대 60개월 나눠 낼 수 있는 구독형 서비스 입니다.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10 text-center">
                                {[24, 36, 48, 60].map(m => (
                                    <div key={m} className={`p-5 rounded-3xl border ${m === 60 ? 'bg-[#c5a059] border-none shadow-2xl scale-105' : 'bg-white/10 border-white/10'} transition-all`}>
                                        <div className="text-[9px] font-black opacity-70 mb-2 uppercase tracking-tighter">{m}개월 약정</div>
                                        <div className="text-xl md:text-2xl font-black font-outfit leading-none whitespace-nowrap flex items-baseline justify-center">
                                            <span>{new Intl.NumberFormat('ko-KR').format(data.subs?.[m] || 0)}</span>
                                            <span className="text-[10px] ml-0.5 opacity-80 font-bold">/월</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. 60개월 렌탈 고정형 패키지 */}
                        <div className="premium-gradient p-6 md:p-10 text-white relative overflow-hidden shadow-xl shadow-[#001a3d]/10">
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] -ml-24 -mb-24 opacity-30"></div>
                            <div className="relative z-10 mb-6">
                                <div className="flex justify-between items-start md:items-center mb-2">
                                    <div className="flex items-start md:items-center gap-2.5">
                                        <div className="w-6 h-6 bg-white/20 text-white rounded-full flex items-center justify-center text-[10px] font-black border border-white/20 font-outfit shrink-0 mt-0.5 md:mt-0">3</div>
                                        <h4 className="text-base font-black text-white leading-tight">
                                            60개월 렌탈<br className="md:hidden" /> 고정형 패키지
                                        </h4>
                                    </div>
                                    <span className="text-[7.5px] md:text-[8px] text-blue-300 font-black uppercase tracking-widest border border-blue-300/30 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-blue-300/10 shrink-0">Rental Plan</span>
                                </div>
                                <p className="text-white/60 text-[11px] font-medium ml-8">매월 일정금액을 고정시키고 일부 금액만 선납형으로 결제하는 하이브리드 렌탈 서비스 입니다.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full relative z-10">
                                {[11, 22, 33].map(val => (
                                    <div key={val} className="bg-white/[0.08] backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl transition-all text-center group flex flex-col justify-center shadow-inner">
                                        <div className="text-[#c5a059] text-sm md:text-base font-black mb-1 md:mb-2 tracking-tight group-hover:scale-105 transition-transform">월 {val}만원 고정</div>
                                        <div className="flex flex-row md:flex-col items-center justify-center gap-2 md:gap-0.5">
                                            <p className="text-[8px] text-white/40 font-black tracking-widest uppercase">선납금</p>
                                            <p className="text-lg md:text-xl font-black text-white font-outfit whitespace-nowrap">{calculatePackage(data.finalBenefit, val * 10000, val * 500000 / 1.1)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* 구독 PLUS 서비스 */}
                        <div className="purple-premium-gradient p-8 md:p-14 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-4xl"></div>
                            <div className="relative z-10 space-y-12">
                                <div className="space-y-3 text-center">
                                    <span className="bg-[#facc15] text-[#311b92] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block shadow-lg">Upgrade</span>
                                    <h3 className="text-2xl md:text-4xl font-black tracking-tight leading-none">구독 <span className="text-white italic">PLUS</span> 서비스</h3>
                                    <p className="text-white/80 text-sm md:text-base font-semibold leading-relaxed">
                                        월 구독료에 조금만 추가하면 <br className="md:hidden" />
                                        <span className="text-[#facc15] font-black underline underline-offset-4 decoration-[#facc15]/30">최신 가전</span>까지 드립니다.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] space-y-4 shadow-2xl">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                            <span className="font-black text-sm md:text-base tracking-tight">PLUS A 타입</span>
                                            <button onClick={() => setModalType('A')} className="bg-white text-[#311b92] px-3 py-1.5 rounded-xl text-[9px] font-black shadow-lg active:scale-95 transition-all">제품 자세히 보기</button>
                                        </div>
                                        <div className="space-y-2.5 px-0.5">
                                            {[24, 36, 48, 60].map(m => {
                                                const fallbackA = { 24: 40000, 36: 30000, 48: 25000, 60: 20000 };
                                                return (
                                                    <div key={m} className={`flex justify-between items-center text-[12px] md:text-[13px] font-extrabold ${m === 60 ? 'text-[#facc15]' : 'text-white'}`}>
                                                        <span>{m}개월</span>
                                                        <span className="font-outfit">+{new Intl.NumberFormat('ko-KR').format(data.plusAdds?.A?.[m] || fallbackA[m])}원</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] space-y-4 shadow-2xl">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                            <span className="font-black text-sm md:text-base tracking-tight">PLUS B 타입</span>
                                            <button onClick={() => setModalType('B')} className="bg-white text-[#6a1b9a] px-3 py-1.5 rounded-xl text-[9px] font-black shadow-lg active:scale-95 transition-all">제품 자세히 보기</button>
                                        </div>
                                        <div className="space-y-2.5 px-0.5">
                                            {[24, 36, 48, 60].map(m => {
                                                const fallbackB = { 24: 65000, 36: 45000, 48: 35000, 60: 30000 };
                                                return (
                                                    <div key={m} className={`flex justify-between items-center text-[12px] md:text-[13px] font-extrabold ${m === 60 ? 'text-[#facc15]' : 'text-white'}`}>
                                                        <span>{m}개월</span>
                                                        <span className="font-outfit">+{new Intl.NumberFormat('ko-KR').format(data.plusAdds?.B?.[m] || fallbackB[m])}원</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 전용 혜택 카드 */}
                        <div className="luxury-card p-10 md:p-14 bg-white border border-gray-100 shadow-xl space-y-10">
                            <h4 className="text-xl md:text-2xl font-black text-[#001a3d] flex items-center gap-3 md:gap-4 whitespace-nowrap">
                                <div className="w-2 h-8 md:w-2.5 md:h-10 bg-[#c5a059] rounded-full shrink-0"></div>
                                계약 고객 특별 무상 서비스
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#f8fafc] p-6 md:p-8 rounded-[2rem] flex items-center gap-5 md:gap-8 border border-gray-100/50 hover:bg-white transition-all group cursor-default shadow-sm hover:shadow-xl hover:shadow-gray-200/50">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white shadow-lg rounded-[1rem] md:rounded-[1.25rem] flex items-center justify-center text-[#c5a059] transition-transform group-hover:rotate-6 border border-gray-50"><ShieldCheck size={28} className="md:w-8 md:h-8" /></div>
                                    <div>
                                        <p className="text-[9px] md:text-[11px] font-black text-[#c5a059] uppercase tracking-[0.15em] mb-1 opacity-80 whitespace-nowrap">Upgrade Option 01</p>
                                        <p className="text-base md:text-lg font-black text-[#2c3e50] tracking-tight leading-tight md:leading-snug break-keep">
                                            고성능 더블로이유리<br /> 무상 업그레이드
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-[#f8fafc] p-6 md:p-8 rounded-[2rem] flex items-center gap-5 md:gap-8 border border-gray-100/50 hover:bg-white transition-all group cursor-default shadow-sm hover:shadow-xl hover:shadow-gray-200/50">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-white shadow-lg rounded-[1rem] md:rounded-[1.25rem] flex items-center justify-center text-[#c5a059] transition-transform group-hover:rotate-6 border border-gray-50"><ExternalLink size={28} className="md:w-8 md:h-8" /></div>
                                    <div>
                                        <p className="text-[9px] md:text-[11px] font-black text-[#c5a059] uppercase tracking-[0.15em] mb-1 opacity-80 whitespace-nowrap">Upgrade Option 02</p>
                                        <p className="text-base md:text-lg font-black text-[#2c3e50] tracking-tight leading-tight md:leading-snug break-keep">
                                            최고급 블랙 STS<br /> 방충망 전면 교체
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-4">
                    <h3 className="text-lg font-black text-[#001a3d] flex items-center gap-2 px-1">
                        <div className="w-8 h-8 bg-gray-100 text-[#001a3d] rounded-lg flex items-center justify-center shadow-sm"><CheckCircle2 size={18} /></div>
                        상세 견적 내역
                    </h3>

                    <div className="luxury-card overflow-hidden border-none shadow-xl">
                        <div className="bg-[#1e40af] px-6 py-3.5 flex justify-between items-center text-white">
                            <span className="text-[11px] font-black uppercase tracking-widest">Item List</span>
                            <span className="text-[10px] font-bold opacity-80">부가세 포함</span>
                        </div>
                        <div className="p-4 md:p-6 bg-[#f8fafc] grid grid-cols-1 md:grid-cols-2 gap-5">
                            {data.items?.map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl flex flex-col justify-between shadow-sm border border-gray-100 group transition-all p-3 md:p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-outfit tracking-tighter transition-transform group-hover:scale-110">#{idx + 1}</span>
                                            <h4 className="text-sm font-black text-[#001a3d]">{item.loc}</h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-[#001a3d] font-outfit">{formatKrw(item.price)}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[#fcfcfd] border border-gray-100/80 p-2 rounded-xl space-y-2 shadow-inner relative overflow-hidden">
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[11px] font-bold relative z-10">
                                            <div className="space-y-0.5">
                                                <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">제품명</p>
                                                <p className="text-[#2c3e50] font-extrabold truncate">{item.prod}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">규격</p>
                                                <p className="text-[#2c3e50] font-extrabold font-outfit tracking-tighter">{item.size}</p>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">창형태</p>
                                                <div className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-[#2c3e50] tracking-tight flex items-center">
                                                    {(item.winType && item.winType.trim() !== "") ? item.winType : '-'}
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">{item.isEtc ? '상세내용' : '모델명'}</p>
                                                <div className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-[#2c3e50] tracking-tight flex items-center">
                                                    {(item.model && item.model.trim() !== "") ? item.model : '-'}
                                                </div>
                                            </div>

                                            {/* 옵션 정보 (잠금장치/방충망) */}
                                            {(item.handle || item.screen) && !item.isEtc && (
                                                <div className="col-span-2 space-y-1 pt-1 border-t border-gray-100/50 mt-1">
                                                    <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">추가 옵션</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {item.handle && (
                                                            <div className="p-2 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 flex flex-col justify-center">
                                                                <span className="text-[8px] text-gray-400 mb-0.5">핸들</span>
                                                                <span className="break-keep leading-tight">{item.handle}</span>
                                                            </div>
                                                        )}
                                                        {item.screen && (
                                                            <div className="p-2 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 flex flex-col justify-center">
                                                                <span className="text-[8px] text-gray-400 mb-0.5">방충망</span>
                                                                <span className="break-keep leading-tight">{item.screen}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {!item.isEtc && (
                                                <div className="col-span-2 pt-2 border-t border-gray-100/50 space-y-3">

                                                    {/* 1. 유리 사양 (스펙) - 한 줄에 파란색/핑크색 */}
                                                    <div className="space-y-1">
                                                        <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">유리사양</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="bg-[#ebf5ff] text-[#2563eb] px-2.5 py-2 rounded-lg border border-blue-50 flex flex-col justify-center">
                                                                <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">Inner (내부)</span>
                                                                <span className="text-[10px] font-black leading-tight break-keep">{item.glassIn || '-'}</span>
                                                            </div>
                                                            {item.glassOut && item.glassOut.trim() !== "" && (
                                                                <div className="bg-[#fff0f6] text-[#db2777] px-2.5 py-2 rounded-lg border border-pink-50 flex flex-col justify-center">
                                                                    <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">Outer (외부)</span>
                                                                    <span className="text-[10px] font-black leading-tight break-keep">{item.glassOut}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 2. 유리 두께/종류 (상세) - 한 줄에 파란색/핑크색 */}
                                                    {(item.thickIn || item.typeIn || item.thickOut || item.typeOut) && (
                                                        <div className="space-y-1">
                                                            <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">유리두께</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="bg-[#ebf5ff] text-[#2563eb] px-2.5 py-2 rounded-lg border border-blue-50 flex flex-col justify-center opacity-90">
                                                                    <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">Inner Thick</span>
                                                                    <div className="text-[9px] font-bold flex gap-1.5 items-center">
                                                                        <span>{item.thickIn || '-'}</span>
                                                                    </div>
                                                                </div>
                                                                {(item.thickOut) && (
                                                                    <div className="bg-[#fff0f6] text-[#db2777] px-2.5 py-2 rounded-lg border border-pink-50 flex flex-col justify-center opacity-90">
                                                                        <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">Outer Thick</span>
                                                                        <div className="text-[9px] font-bold flex gap-1.5 items-center">
                                                                            <span>{item.thickOut || '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="luxury-card p-6 md:p-10 flex justify-center items-center bg-[#001a3d] text-white border-none shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-blue-500/5 rounded-full blur-[120px]"></div>
                            <div className="flex flex-row items-center gap-4 md:gap-10 relative z-10 w-full justify-center">
                                <div className="w-10 h-10 md:w-14 md:h-14 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#c5a059] shadow-inner border border-white/10 shrink-0"><CheckCircle2 size={24} className="md:w-7 md:h-7" /></div>
                                <div className="flex flex-col items-start gap-1">
                                    <p className="text-white/40 font-black text-[8px] md:text-[9px] uppercase tracking-[0.3em] font-outfit leading-none mb-0.5">Investment Total Summary</p>
                                    <div className="relative inline-block">
                                        <p className="text-3xl md:text-5xl font-black text-[#c5a059] font-outfit tracking-tighter leading-none">{formatKrw(data.finalQuote)}</p>
                                        <p className="text-[9px] text-white/40 font-bold absolute -right-0 -bottom-3.5 md:-bottom-4.5 whitespace-nowrap">부가세 포함</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {data.pdfUrl && (
                            <div className="flex justify-center pt-2">
                                <a
                                    href={data.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="premium-btn w-full py-5 md:py-6 px-4 md:px-16 flex items-center justify-center gap-2 md:gap-4 shadow-xl text-base md:text-lg tracking-tight font-black hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
                                >
                                    <Download size={20} className="md:w-6 md:h-6" /> 상세 견적서 PDF 다운로드
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {banners?.map((b, i) => (
                        <a key={i} href={b.link} target="_blank" rel="noopener noreferrer" className="luxury-card overflow-hidden bg-white shadow-xl border-none transition-transform hover:scale-[1.01] duration-500">
                            <img src={b.img} alt="광고 배너" className="w-full h-auto object-cover" />
                        </a>
                    ))}
                </div>

                <footer className="pt-8 pb-4 text-center space-y-6">
                    <p className="text-gray-400 font-bold text-[9px] uppercase tracking-[0.6em] opacity-50">Main Project Partner</p>
                    <h4 className="text-lg md:text-2xl font-black text-[#001a3d] tracking-tighter decoration-luxury decoration-2 whitespace-nowrap px-2">
                        (주)KCC글라스 홈씨씨 | (주)티유디지털
                    </h4>
                    <div className="max-w-2xl mx-auto space-y-4 text-[11px] font-extrabold text-gray-500 leading-relaxed px-4">
                        <p className="opacity-80 text-center">서울시 가산디지털1로 83, 파트너스타워1, 802호<br />사업자등록번호: 220-87-15092 ｜ 김정열 대표이사</p>
                        <div className="bg-gray-100/80 p-4 rounded-[1.5rem] border border-gray-200/50 text-[#001a3d] shadow-inner inline-block min-w-[300px]">
                            <span className="text-[9px] uppercase tracking-[0.4em] text-[#c5a059] font-black mb-1 inline-block border-b-2 border-[#c5a059]/10 pb-1">Deposit Info</span><br />
                            <span className="text-base font-black font-outfit">(국민은행) 421737-04-015908</span><br />
                            <span className="font-black text-[11px] opacity-80 mt-0.5 block tracking-wider">계좌주 : (주)티유디지털</span>
                        </div>
                    </div>
                </footer>

                <div className="pt-2 border-t border-gray-100/30 text-center">
                    <img src="https://cdn.imweb.me/upload/S20250904697320f4fd9ed/87d2040aa0130.png" alt="하단 로고" className="w-full max-w-2xl mx-auto object-contain opacity-100 rounded-2xl" />
                </div>
            </div>

            {/* Contact Menu */}
            <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-3">
                {showContactMenu && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in duration-200 mb-2">
                        <a href="tel:01046057977" className="bg-white text-[#001a3d] p-3 rounded-xl shadow-xl flex items-center justify-between gap-2 min-w-[130px] border border-gray-100 hover:bg-gray-50 transition-colors">
                            <span className="font-bold text-xs">전화걸기</span>
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center shadow-md"><Phone size={12} fill="currentColor" /></div>
                        </a>
                        <a href="sms:01046057977" className="bg-white text-[#001a3d] p-3 rounded-xl shadow-xl flex items-center justify-between gap-2 min-w-[130px] border border-gray-100 hover:bg-gray-50 transition-colors">
                            <span className="font-bold text-xs">문자보내기</span>
                            <div className="w-6 h-6 bg-yellow-400 text-white rounded-full flex items-center justify-center shadow-md"><MessageCircle size={12} fill="currentColor" /></div>
                        </a>
                    </div>
                )}
                <button
                    onClick={() => setShowContactMenu(!showContactMenu)}
                    className="bg-[#001a3d] text-[#c5a059] p-3 rounded-[1.25rem] shadow-2xl shadow-[#001a3d]/50 flex items-center gap-2 active:scale-90 transition-all border-2 border-white/10 group"
                >
                    <div className={`w-6 h-6 bg-[#c5a059] text-[#001a3d] rounded-lg flex items-center justify-center shadow-lg relative z-10 transition-transform duration-300 ${showContactMenu ? 'rotate-45' : 'group-hover:rotate-12'}`}>
                        {showContactMenu ? <X size={16} /> : <MessageCircle size={16} />}
                    </div>
                    <span className="text-white font-black pr-1 text-[11px] tracking-tighter relative z-10 uppercase">
                        {showContactMenu ? '닫기' : '문의하기'}
                    </span>
                </button>
            </div>


            {modalType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

                    {/* Overlay: Closes modal */}
                    <div
                        className="absolute inset-0 bg-[#001a3d]/98 backdrop-blur-2xl transition-opacity animate-in fade-in"
                        onClick={() => setModalType(null)}
                    ></div>

                    {/* Modal Content: Stops click propagation to prevent closing */}
                    <div
                        className="bg-white w-[92%] md:w-full max-w-xl h-[90vh] md:h-[85vh] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 shadow-black/40 border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="p-6 md:p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/10 shrink-0">
                            <div className="space-y-2">
                                <span className="bg-[#c5a059] text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Membership Choice</span>
                                <h3 className="text-lg md:text-xl font-black text-[#001a3d] leading-none tracking-tighter mt-1">옵션 타입 {modalType} 가전</h3>
                            </div>
                            <button onClick={() => setModalType(null)} className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center text-[#2c3e50] shadow-sm active:scale-95">
                                <X size={26} />
                            </button>
                        </header>

                        {/* Scrollable Area */}
                        <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-gray-50/5 min-h-0 relative" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {appliances?.[modalType]?.map((item, idx) => (
                                    <div key={idx} className="bg-white rounded-[2rem] border border-gray-100 p-5 flex flex-col gap-5 shadow-xl shadow-gray-100/50 group hover:border-[#c5a059]/30 transition-all">
                                        <div className="w-full aspect-video bg-white rounded-3xl overflow-hidden border-2 border-gray-50 relative shrink-0">
                                            <img src={item.img} alt={item.name} className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute top-2 right-2 bg-[#001a3d] text-[#c5a059] text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Premium</div>
                                        </div>
                                        <div className="space-y-4 px-1 flex-1 flex flex-col">
                                            <div className="flex-1">
                                                <span className="text-[#c5a059] text-[9px] font-black uppercase tracking-widest bg-[#c5a059]/10 px-2.5 py-1 rounded-lg mb-2 inline-block">{item.cat}</span>
                                                <h4 className="text-base font-black text-[#2c3e50] leading-tight line-clamp-2 h-10 tracking-tight">{item.name}</h4>
                                                <p className="text-[10px] text-gray-400 font-black mt-2 font-outfit uppercase tracking-widest opacity-80">{item.model}</p>
                                            </div>

                                            {/* Link Logic: Render <a> for valid links, <button> for placeholders */}
                                            {item.link && item.link !== '#' && item.link.trim() !== '' ? (
                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-[#001a3d] text-white font-black py-2.5 px-4 text-[11px] flex items-center justify-center gap-2 w-full rounded-xl transition-all tracking-tight hover:bg-[#c5a059] hover:text-[#001a3d] shadow-lg shadow-black/10 active:scale-95 cursor-pointer block text-center no-underline"
                                                >
                                                    제품 자세히 보기 <ExternalLink size={13} />
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        alert("상세 페이지 준비 중입니다.");
                                                    }}
                                                    className="bg-[#001a3d] text-white font-black py-2.5 px-4 text-[11px] flex items-center justify-center gap-2 w-full rounded-xl transition-all tracking-tight hover:bg-[#c5a059] hover:text-[#001a3d] shadow-lg shadow-black/10 active:scale-95 cursor-pointer"
                                                >
                                                    제품 자세히 보기 <ExternalLink size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPage;
