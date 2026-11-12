import type { Language } from "./types";

export const LANGUAGES: { code: Language; label: string; native: string; speech: string }[] = [
  { code: "en", label: "English", native: "English", speech: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", speech: "ta-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", speech: "te-IN" },
];

export function speechCode(lang: Language) {
  return LANGUAGES.find((l) => l.code === lang)?.speech ?? "en-IN";
}

type Dict = Record<string, string>;

const en: Dict = {
  "nav.overview": "Overview",
  "nav.farms": "My Farms",
  "nav.soil": "Soil Intelligence",
  "nav.fertilizer": "Fertilizer Optimizer",
  "nav.krishi": "Krishi AI",
  "nav.voice": "Voice Assistant",
  "nav.doctor": "Crop Doctor",
  "nav.weather": "Weather Intelligence",
  "nav.agent": "Smart Agent",
  "nav.reports": "Reports",
  "nav.workspace": "Workspace",
  "nav.network": "Farmers Network",
  "nav.resources": "Resources",
  "greet.morning": "Good morning",
  "greet.afternoon": "Good afternoon",
  "greet.evening": "Good evening",
  "greet.sub": "Here's your farm intelligence for today.",
  "search.placeholder": "Search farms, crops, advisories...",
  "chat.placeholder": "Ask about crops, soil, pests, weather...",
  "chat.listening": "Listening…",
  "chat.thinking": "Searching agricultural knowledge…",
  "voice.tap": "Tap to speak",
  "voice.speaking": "Speaking…",
};

const hi: Dict = {
  "nav.overview": "अवलोकन",
  "nav.farms": "मेरे खेत",
  "nav.soil": "मृदा जानकारी",
  "nav.fertilizer": "उर्वरक अनुकूलक",
  "nav.krishi": "कृषि AI",
  "nav.voice": "वॉइस सहायक",
  "nav.doctor": "फसल डॉक्टर",
  "nav.weather": "मौसम जानकारी",
  "nav.agent": "स्मार्ट एजेंट",
  "nav.reports": "रिपोर्ट",
  "nav.workspace": "कार्यक्षेत्र",
  "nav.network": "किसान नेटवर्क",
  "nav.resources": "संसाधन",
  "greet.morning": "सुप्रभात",
  "greet.afternoon": "नमस्कार",
  "greet.evening": "शुभ संध्या",
  "greet.sub": "आज के लिए आपके खेत की जानकारी।",
  "search.placeholder": "खेत, फसल, सलाह खोजें...",
  "chat.placeholder": "फसल, मिट्टी, कीट, मौसम के बारे में पूछें...",
  "chat.listening": "सुन रहा है…",
  "chat.thinking": "कृषि ज्ञान खोज रहा है…",
  "voice.tap": "बोलने के लिए टैप करें",
  "voice.speaking": "बोल रहा है…",
};

const ta: Dict = {
  "nav.overview": "கண்ணோட்டம்",
  "nav.farms": "என் பண்ணைகள்",
  "nav.soil": "மண் நுண்ணறிவு",
  "nav.fertilizer": "உர மேம்படுத்தி",
  "nav.krishi": "கிருஷி AI",
  "nav.voice": "குரல் உதவியாளர்",
  "nav.doctor": "பயிர் மருத்துவர்",
  "nav.weather": "வானிலை நுண்ணறிவு",
  "nav.agent": "ஸ்மார்ட் முகவர்",
  "nav.reports": "அறிக்கைகள்",
  "nav.workspace": "பணியிடம்",
  "nav.network": "விவசாயிகள் வலையமைப்பு",
  "nav.resources": "வளங்கள்",
  "greet.morning": "காலை வணக்கம்",
  "greet.afternoon": "மதிய வணக்கம்",
  "greet.evening": "மாலை வணக்கம்",
  "greet.sub": "இன்றைய உங்கள் பண்ணை நுண்ணறிவு.",
  "search.placeholder": "பண்ணைகள், பயிர்கள், ஆலோசனைகள் தேடுக...",
  "chat.placeholder": "பயிர், மண், பூச்சி, வானிலை பற்றி கேளுங்கள்...",
  "chat.listening": "கேட்கிறது…",
  "chat.thinking": "வேளாண் அறிவைத் தேடுகிறது…",
  "voice.tap": "பேச தட்டவும்",
  "voice.speaking": "பேசுகிறது…",
};

const te: Dict = {
  "nav.overview": "అవలోకనం",
  "nav.farms": "నా పొలాలు",
  "nav.soil": "నేల సమాచారం",
  "nav.fertilizer": "ఎరువుల ఆప్టిమైజర్",
  "nav.krishi": "కృషి AI",
  "nav.voice": "వాయిస్ అసిస్టెంట్",
  "nav.doctor": "పంట డాక్టర్",
  "nav.weather": "వాతావరణ సమాచారం",
  "nav.agent": "స్మార్ట్ ఏజెంట్",
  "nav.reports": "నివేదికలు",
  "nav.workspace": "వర్క్‌స్పేస్",
  "nav.network": "రైతుల నెట్‌వర్క్",
  "nav.resources": "వనరులు",
  "greet.morning": "శుభోదయం",
  "greet.afternoon": "శుభ మధ్యాహ్నం",
  "greet.evening": "శుభ సాయంత్రం",
  "greet.sub": "ఈ రోజు మీ పొలం సమాచారం.",
  "search.placeholder": "పొలాలు, పంటలు, సలహాలు వెతకండి...",
  "chat.placeholder": "పంట, నేల, పురుగులు, వాతావరణం గురించి అడగండి...",
  "chat.listening": "వింటోంది…",
  "chat.thinking": "వ్యవసాయ జ్ఞానాన్ని వెతుకుతోంది…",
  "voice.tap": "మాట్లాడటానికి నొక్కండి",
  "voice.speaking": "మాట్లాడుతోంది…",
};

const dictionaries: Record<Language, Dict> = { en, hi, ta, te };

export function translate(lang: Language, key: string) {
  return dictionaries[lang][key] ?? en[key] ?? key;
}
