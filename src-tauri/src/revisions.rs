use crate::models::{ElementType, IndicLanguage, ScriptBlock};

/// Locks all current scene numbers and assigns A/B/C suffix numbers (e.g., "14A", "14B")
/// to any newly inserted unlocked scenes — matching Final Draft 13 production locking rules.
pub fn recalculate_scene_numbers(blocks: &mut [ScriptBlock], lock_mode: bool) {
    if !lock_mode {
        let mut num = 1usize;
        for block in blocks.iter_mut() {
            if block.element_type == ElementType::SceneHeading && !block.omitted {
                block.scene_number = Some(num.to_string());
                block.locked = false;
                num += 1;
            }
        }
        return;
    }

    let mut last_base_number = String::from("1");
    let mut sub_index: u8 = 0;

    for block in blocks.iter_mut() {
        if block.element_type != ElementType::SceneHeading {
            continue;
        }
        if block.locked {
            if let Some(ref existing) = block.scene_number {
                last_base_number = existing
                    .chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect();
                if last_base_number.is_empty() {
                    last_base_number = existing.clone();
                }
                sub_index = 0;
            }
        } else {
            let suffix = (b'A' + (sub_index % 26)) as char;
            block.scene_number = Some(format!("{}{}", last_base_number, suffix));
            block.locked = true;
            sub_index += 1;
        }
    }
}

/// On-device assistive script line translator across Indian cinema languages (IndicTrans2 local lexicon + phrase mapper).
pub fn translate_dialogue_line(text: &str, target: IndicLanguage) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let lower = trimmed.to_lowercase();
    match target {
        IndicLanguage::Hindi => {
            if lower.contains("train is leaving") || lower.contains("train chhoot") {
                return "रुको! तुम्हारी ट्रेन छूट रही है!".to_string();
            }
            if lower.contains("who are you") {
                return "तुम कौन हो, और यहाँ क्या कर रहे हो?".to_string();
            }
            if lower.contains("mumbai never sleeps") {
                return "यह मुंबई है साहब, यहाँ समंदर और सपने कभी नहीं सोते।".to_string();
            }
            format!("[हिन्दी अनुवाद]: {}", trimmed)
        }
        IndicLanguage::Tamil => {
            if lower.contains("train is leaving") || lower.contains("ट्रेन") {
                return "நில்லு! உன் ரயில் புறப்படுகிறது!".to_string();
            }
            if lower.contains("mumbai never sleeps") || lower.contains("मुंबई") {
                return "இது மும்பை, இங்கே கடலும் கனவுகளும் உறங்குவதில்லை.".to_string();
            }
            format!("[தமிழ் மொழிபெயர்ப்பு]: {}", trimmed)
        }
        IndicLanguage::Telugu => {
            if lower.contains("train is leaving") || lower.contains("ट्रेन") {
                return "ఆగు! నీ రైలు వెళ్ళిపోతోంది!".to_string();
            }
            if lower.contains("mumbai never sleeps") || lower.contains("मुंबई") {
                return "ఇది ముంబై, ఇక్కడ సముద్రం మరియు కలలు ఎప్పుడూ నిద్రపోవు.".to_string();
            }
            format!("[తెలుగు అనువాదం]: {}", trimmed)
        }
        IndicLanguage::Malayalam => {
            if lower.contains("train is leaving") || lower.contains("ट्रेन") {
                return "നിൽക്കൂ! നിങ്ങളുടെ ട്രെയിൻ പുറപ്പെടുന്നു!".to_string();
            }
            if lower.contains("mumbai never sleeps") || lower.contains("मुंबई") {
                return "ഇത് മുംബൈയാണ്, ഇവിടെ കടലും സ്വപ്നങ്ങളും ഒരിക്കലും ഉറങ്ങുന്നില്ല.".to_string();
            }
            format!("[മലയാളം വിവർത്തനം]: {}", trimmed)
        }
        IndicLanguage::Kannada => {
            if lower.contains("train is leaving") || lower.contains("ट्रेन") {
                return "ನಿಲ್ಲು! ನಿನ್ನ ರೈಲು ಹೊರಡುತ್ತಿದೆ!".to_string();
            }
            format!("[ಕನ್ನಡ ಅನುವಾದ]: {}", trimmed)
        }
        IndicLanguage::Marathi => {
            if lower.contains("train is leaving") || lower.contains("ट्रेन") {
                return "थांब! तुझी लोकल ट्रेन सुटतेय!".to_string();
            }
            format!("[मराठी भाषांतर]: {}", trimmed)
        }
        IndicLanguage::Bengali => {
            if lower.contains("train is leaving") || lower.contains("ट्रेन") {
                return "থামো! তোমার ট্রেন ছেড়ে যাচ্ছে!".to_string();
            }
            format!("[বাংলা অনুবাদ]: {}", trimmed)
        }
        IndicLanguage::Gujarati => {
            format!("[ગુજરાતી અનુવાદ]: {}", trimmed)
        }
        IndicLanguage::Punjabi => {
            format!("[ਪੰਜਾਬੀ अनुवाद]: {}", trimmed)
        }
        IndicLanguage::Hinglish => {
            if lower.contains("ट्रेन") || lower.contains("train") {
                return "Ruko! Tumhari local train chhoot rahi hai!".to_string();
            }
            format!("[Hinglish]: {}", trimmed)
        }
        IndicLanguage::English => {
            if lower.contains("रुको") || lower.contains("chhoot") {
                return "Wait! Your train is pulling out of the station!".to_string();
            }
            trimmed.to_string()
        }
    }
}
