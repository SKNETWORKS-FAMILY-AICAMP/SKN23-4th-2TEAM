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
export const AI_RESPONSES: Record<Lang, Record<string, { diagnosis: string; history: string; related: string; followup: string; resolved: string; followUps: string[] }>> = {
  KO: {
    default: {
      diagnosis:
        "에러코드 분석 결과:\n\n1. **원인 분석**: 해당 에러는 용접 아크 불안정으로 인한 것으로 판단됩니다.\n\n2. **조치 방법**:\n   - 와이어 피딩 속도를 확인하세요 (권장: 8-12 m/min)\n   - 토치 노즐의 스패터 축적을 점검하세요\n   - 가스 유량이 15-20 L/min 범위인지 확인하세요\n\n3. **긴급도**: 보통 — 즉시 중단할 필요는 없으나, 1시간 이내 조치를 권장합니다.\n\n4. **예상 조치 시간**: 약 15-20분\n\n조치 완료 후 테스트 용접을 실행하여 아크 안정성을 재확인하세요.",
      history:
        "정비 로그 (최근 3건):\n\n**2026-03-05 14:20** - 정기 점검 완료\n- 토치 케이블 교체 및 냉각수 보충\n- 담당자: 김철수 엔지니어\n\n**2026-02-18 09:15** - 긴급 정비 (Arc Loss)\n- 피팅 보드 접점 세척 및 센서 보정\n- 담당자: 이영희 엔지니어\n\n**2026-01-20 16:45** - 소모품 교체\n- 팁 및 노즐 전체 교환\n- 담당자: 박민수 엔지니어",
      related:
        "관련 에러 코드 분석 결과 (LLM):\n\n- **E-102**: 토치 전력 공급 불안정\n- **E-304**: 가스 압력 저하\n- **E-015**: 와이어 피딩 모터 과부하\n\n위 에러들은 현재 발생한 아크 불안정 에러와 연관될 가능성이 높습니다. 각 코드를 입력하여 상세 진단을 진행할 수 있습니다.",
      followup:
        "추가 질문 (LLM):\n\n현 조치 사항을 적용했음에도 문제가 지속된다면, 다음 사항을 확인해 주세요.\n\n1. 용접기 내부의 'Main PCB' 발광 다이오드가 깜빡이나요?\n2. 토치를 흔들었을 때 아크의 세기가 변하나요?\n3. 최근에 가스 실린더를 교체하셨나요?\n\n위 질문에 대한 답변을 준비해 주시면 더 정밀한 진단이 가능합니다.",
      resolved:
        "**문제가 성공적으로 해결되었습니다!**\n\n현장의 안전을 위해 정기적인 소모품 점검을 권장하며, 추가적인 이상 징후 발생 시 언제든지 WELD-BOT을 호출해 주세요.\n\n수고하셨습니다. 안전 작업 되십시오!",
      followUps: ["관련 에러코드 더 보기", "정비 이력 확인", "엔지니어 호출"],
    },
  },
  EN: {
    default: {
      diagnosis:
        "Error Code Analysis:\n\n1. **Root Cause**: This error is likely caused by welding arc instability.\n\n2. **Corrective Actions**:\n   - Check wire feeding speed (recommended: 8-12 m/min)\n   - Inspect torch nozzle for spatter buildup\n   - Verify gas flow rate is within 15-20 L/min\n\n3. **Urgency**: Moderate — No immediate stop required, but action within 1 hour is recommended.\n\n4. **Estimated Fix Time**: ~15-20 minutes\n\nAfter correction, run a test weld to verify arc stability.",
      history:
        "Maintenance Log (Recent 3 entries):\n\n**2026-03-05 14:20** - Routine Inspection Completed\n- Replaced torch cable and refilled coolant\n- Technician: John Smith\n\n**2026-02-18 09:15** - Emergency Maintenance (Arc Loss)\n- Cleaned feeding board contacts and calibrated sensor\n- Technician: Jane Doe\n\n**2026-01-20 16:45** - Consumables Replacement\n- Replaced tips and nozzles\n- Technician: Mike Ross",
      related:
        "Related Error Code Analysis (LLM):\n\n- **E-102**: Unstable torch power supply\n- **E-304**: Low gas pressure\n- **E-015**: Wire feeding motor overload\n\nThese errors are often associated with the current arc instability issues.",
      followup:
        "Follow-up Questions (LLM):\n\nIf the issue persists despite corrections, please verify:\n\n1. Is the LED on the 'Main PCB' blinking?\n2. Does the arc intensity change when shaking the torch?\n3. Have you replaced the gas cylinder recently?",
      resolved:
        "**Issue Resolved Successfully!**\n\nFor onsite safety, we recommend regular consumable inspections. If any further abnormalities occur, please call WELD-BOT anytime.\n\nStay safe and keep up the great work!",
      followUps: ["View Related Errors", "Check Maintenance Log", "Call Engineer"],
    },
  },
  UZ: {
    default: {
      diagnosis:
        "Xato kodi tahlili:\n\n1. **Sabab**: Bu xato payvandlash yoyining beqarorligi sababli yuzaga kelgan.\n\n2. **Tuzatish choralari**:\n   - Sim uzatish tezligini tekshiring (tavsiya: 8-12 m/min)\n   - Mash'ala uchining chiqindilarini tekshiring\n   - Gaz oqimi 15-20 L/min ekanligini tekshiring\n\n3. **Shoshilinchlik**: O'rtacha — darhol to'xtatish shart emas, 1 soat ichida choralar ko'rilsin.\n\n4. **Taxminiy tuzatish vaqti**: ~15-20 daqiqa\n\nTuzatishdan so'ng sinov payvandini o'tkazing.",
      history:
        "Ta'mirlash jurnali (Oxirgi 3 ta):\n\n**2026-03-05 14:20** - Rejali tekshiruv yakunlandi\n- Mash'ala kabeli almashtirildi va sovutish suyuqligi to'ldirildi\n- Mas'ul: Muhandis Kim Chul Su\n\n**2026-02-18 09:15** - Shoshilinch ta'mirlash (Arc Loss)\n- Kontaktlar tozalandi va datchik kalibrlandi\n- Mas'ul: Muhandis Li Young Xi\n\n**2026-01-20 16:45** - Sarflash materiallarini almashtirish\n- Uchliklar va burunlar to'liq almashtirildi\n- Mas'ul: Muhandis Park Min Su",
      related:
        "Tegishli xato kodi tahlili (LLM):\n\n- **E-102**: Beqaror mash'al quvvat manbai\n- **E-304**: Past gaz bosimi\n- **E-015**: Sim uzatish motorining haddan tashqari yuklanishi\n\nUshbu xatolar hozirgi yoy barqarorsizligi bilan bog'liq bo'lishi mumkin.",
      followup:
        "Qo'shimcha savollar (LLM):\n\nAgar muammo davom etsa, tekshirib ko'ring:\n\n1. 'Main PCB' platasidagi LED yonib-o'chyaptimi?\n2. Mash'alani silkitganda yoy kuchi o'zgaradimi?\n3. Gaz ballonini yaqinda almashtirdingizmi?",
      resolved:
        "**Muammo muvaffaqiyatli hal qilindi!**\n\nXavfsizlik uchun sarf materiallarini muntazam tekshirishni tavsiya qilamiz. Agar yana biror nosozlik yuz bersa, istalgan vaqtda WELD-BOT-ni chaqiring.\n\nXavfsiz ish faoliyati tilaymiz!",
      followUps: ["Tegishli xatolarni ko'rish", "Ta'mirlash tarixini tekshirish", "Muhandisni chaqirish"],
    },
  },
};