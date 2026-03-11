export type Lang = "KO" | "EN" | "UZ";

export const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "KO", label: "🇰🇷 KO" },
  { value: "EN", label: "🇺🇸 EN" },
  { value: "UZ", label: "🇺🇿 UZ" },
];

type LangPack = Record<Lang, Record<string, string>>;

export const T: LangPack = {
  KO: {
    robotDiag: "로봇 진단",
    welderDiag: "용접기 진단",
    techDict: "용접기술",
    consumables: "소모품",
    errorCodePlaceholder: "에러코드를 입력하세요",
    submitCode: "진단 시작",
    clear: "지우기",
    dbLearning: "v4.6 업데이트를 위해 DB 학습 중입니다.",
    close: "닫기",
    adminMode: "관리자 모드",
    adminWelcome: "관리자 모드에 진입했습니다.",
    backToMain: "현장 패드로 돌아가기",
    diagTitle: "AI 진단 가이드",
    keypadTitle: "에러코드 입력",
    followUp1: "관련 에러코드 더 보기",
    followUp2: "정비 이력 확인",
    followUp3: "엔지니어 호출",
    systemLog: "시스템 로그",
    paramSettings: "파라미터 설정",
    firmwareUpdate: "펌웨어 업데이트",
    userManagement: "사용자 관리",
  },
  EN: {
    robotDiag: "Robot Diag",
    welderDiag: "Welder Diag",
    techDict: "Welding Tech Dict",
    consumables: "Consumables (Wire/Torch)",
    errorCodePlaceholder: "Enter error code",
    submitCode: "Start Diagnosis",
    clear: "Clear",
    dbLearning: "Learning DB for v4.6 update.",
    close: "Close",
    adminMode: "Admin Mode",
    adminWelcome: "Admin mode activated.",
    backToMain: "Back to Field Pad",
    diagTitle: "AI Diagnostic Guide",
    keypadTitle: "Error Code Input",
    followUp1: "View Related Errors",
    followUp2: "Check Maintenance Log",
    followUp3: "Call Engineer",
    systemLog: "System Log",
    paramSettings: "Parameter Settings",
    firmwareUpdate: "Firmware Update",
    userManagement: "User Management",
  },
  UZ: {
    robotDiag: "Robot diagnostikasi",
    welderDiag: "Payvandlash diagnostikasi",
    techDict: "Payvandlash texnologiyasi",
    consumables: "Sarflanuvchilar (Sim/Mash'ala)",
    errorCodePlaceholder: "Xato kodini kiriting",
    submitCode: "Diagnostikani boshlash",
    clear: "O'chirish",
    dbLearning: "v4.6 yangilanishi uchun DB o'rganilmoqda.",
    close: "Yopish",
    adminMode: "Administrator rejimi",
    adminWelcome: "Administrator rejimiga kirildi.",
    backToMain: "Maydon padiga qaytish",
    diagTitle: "AI diagnostika qo'llanmasi",
    keypadTitle: "Xato kodi kiritish",
    followUp1: "Tegishli xatolarni ko'rish",
    followUp2: "Ta'mirlash tarixini tekshirish",
    followUp3: "Muhandisni chaqirish",
    systemLog: "Tizim jurnali",
    paramSettings: "Parametr sozlamalari",
    firmwareUpdate: "Proshivka yangilanishi",
    userManagement: "Foydalanuvchilarni boshqarish",
  },
};

// AI diagnostic mock responses per language
export const AI_RESPONSES: Record<Lang, Record<string, { diagnosis: string; followUps: string[] }>> = {
  KO: {
    default: {
      diagnosis:
        "에러코드 분석 결과:\n\n1. **원인 분석**: 해당 에러는 용접 아크 불안정으로 인한 것으로 판단됩니다.\n\n2. **조치 방법**:\n   - 와이어 피딩 속도를 확인하세요 (권장: 8-12 m/min)\n   - 토치 노즐의 스패터 축적을 점검하세요\n   - 가스 유량이 15-20 L/min 범위인지 확인하세요\n\n3. **긴급도**: 보통 — 즉시 중단할 필요는 없으나, 1시간 이내 조치를 권장합니다.\n\n4. **예상 조치 시간**: 약 15-20분\n\n조치 완료 후 테스트 용접을 실행하여 아크 안정성을 재확인하세요.",
      followUps: ["관련 에러코드 더 보기", "정비 이력 확인", "엔지니어 호출"],
    },
  },
  EN: {
    default: {
      diagnosis:
        "Error Code Analysis:\n\n1. **Root Cause**: This error is likely caused by welding arc instability.\n\n2. **Corrective Actions**:\n   - Check wire feeding speed (recommended: 8-12 m/min)\n   - Inspect torch nozzle for spatter buildup\n   - Verify gas flow rate is within 15-20 L/min\n\n3. **Urgency**: Moderate — No immediate stop required, but action within 1 hour is recommended.\n\n4. **Estimated Fix Time**: ~15-20 minutes\n\nAfter correction, run a test weld to verify arc stability.",
      followUps: ["View Related Errors", "Check Maintenance Log", "Call Engineer"],
    },
  },
  UZ: {
    default: {
      diagnosis:
        "Xato kodi tahlili:\n\n1. **Sabab**: Bu xato payvandlash yoyining beqarorligi sababli yuzaga kelgan.\n\n2. **Tuzatish choralari**:\n   - Sim uzatish tezligini tekshiring (tavsiya: 8-12 m/min)\n   - Mash'ala uchining chiqindilarini tekshiring\n   - Gaz oqimi 15-20 L/min ekanligini tekshiring\n\n3. **Shoshilinchlik**: O'rtacha — darhol to'xtatish shart emas, 1 soat ichida choralar ko'rilsin.\n\n4. **Taxminiy tuzatish vaqti**: ~15-20 daqiqa\n\nTuzatishdan so'ng sinov payvandini o'tkazing.",
      followUps: ["Tegishli xatolarni ko'rish", "Ta'mirlash tarixini tekshirish", "Muhandisni chaqirish"],
    },
  },
};