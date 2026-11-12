"""Rule-based metadata tagging: which crop and topic a passage is about.

The manifest's crop/topic act as defaults when a passage is ambiguous.
Search filters treat crop = NULL as "applies to every crop".
"""

from __future__ import annotations

import re

from .manifest import DocSpec

CROPS: dict[str, list[str]] = {
    "wheat": ["wheat", "गेहूं", "गेहूँ", "கோதுமை", "గోధుమ"],
    "paddy": ["paddy", "rice", "धान", "चावल", "நெல்", "వరి"],
    "maize": ["maize", "corn", "मक्का", "மக்காச்சோளம்", "మొక్కజొన్న"],
    "groundnut": ["groundnut", "peanut", "मूंगफली", "நிலக்கடலை", "வேர்க்கடலை", "వేరుశనగ"],
    "cotton": ["cotton", "कपास", "பருத்தி", "పత్తి"],
    "sugarcane": ["sugarcane", "गन्ना", "கரும்பு", "చెరకు"],
    "tomato": ["tomato", "टमाटर", "தக்காளி", "టమాటా"],
    "pulses": ["black gram", "green gram", "red gram", "pigeon pea", "urd", "moong", "उड़द", "मूंग", "உளுந்து", "பாசிப்பயறு", "మినుము", "పెసర"],
    "banana": ["banana", "केला", "வாழை", "అరటి"],
    "coconut": ["coconut", "नारियल", "தென்னை", "కొబ్బరి"],
}

TOPICS: dict[str, list[str]] = {
    "fertilizer": ["fertiliser", "fertilizer", "urea", "dap", "npk", "muriate", "potash", "nutrient", "top dress", "top-dress", "basal", "kg n", "उर्वरक", "यूरिया", "உரம்", "யூரியா", "ఎరువు"],
    "pest": ["pest", "insect", "borer", "hopper", "aphid", "whitefly", "thrips", "mite", "armyworm", "caterpillar", "larva", "insecticide", "कीट", "பூச்சி", "పురుగు"],
    "disease": ["disease", "blight", "rust", "blast", "wilt", "rot", "mildew", "leaf spot", "fungicide", "virus", "bacterial", "रोग", "நோய்", "తెగులు"],
    "irrigation": ["irrigat", "water management", "soil moisture", "drip", "sprinkler", "flooding", "सिंचाई", "நீர்ப்பாசனம்", "నీటిపారుదల"],
    "seeding": ["sowing", "seed rate", "variety", "varieties", "spacing", "nursery", "transplant", "seed treatment", "बुवाई", "விதைப்பு", "విత్తనం"],
    "soil": ["soil ph", "acidic", "alkaline", "saline", "sodic", "organic carbon", "lime", "gypsum", "soil health", "soil test", "micronutrient", "मिट्टी", "மண்", "నేల"],
    "weather": ["rainfall", "forecast", "temperature", "humidity", "wind speed", "agromet", "monsoon", "मौसम", "வானிலை", "వాతావరణ"],
}


def _hits(text: str, words: list[str]) -> int:
    count = 0
    for w in words:
        if w.isascii():
            count += len(re.findall(rf"\b{re.escape(w)}", text))
        else:
            count += text.count(w)
    return count


def tag(content: str, heading: str | None, spec: DocSpec) -> dict:
    text = f"{heading or ''}\n{content}".lower()
    crop_hits = {crop: _hits(text, words) for crop, words in CROPS.items()}
    named = [c for c, n in crop_hits.items() if n > 0]
    crop = named[0] if len(named) == 1 else spec.crop

    topic_hits = {topic: _hits(text, words) for topic, words in TOPICS.items()}
    best_topic, best = max(topic_hits.items(), key=lambda kv: kv[1])
    if best >= 2:
        topic = best_topic
    else:
        topic = spec.topic or ("weather" if spec.source == "IMD" else "general")

    return {
        "crop": crop,
        "topic": topic,
        "state": spec.state,
        "district": spec.district,
        "season": spec.season,
        "language": spec.language,
        "valid_until": spec.valid_until,
    }
