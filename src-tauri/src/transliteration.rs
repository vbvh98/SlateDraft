use crate::models::{IndicLanguage, TransliterationResult};
use std::time::Instant;

/// Computes the Levenshtein edit distance between two UTF-8 strings.
/// Used to rank phonetic candidate suggestions when a user mistypes a Romanized Indic word.
pub fn levenshtein_distance(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let m = a_chars.len();
    let n = b_chars.len();

    if m == 0 {
        return n;
    }
    if n == 0 {
        return m;
    }

    let mut prev: Vec<usize> = (0..=n).collect();
    let mut curr: Vec<usize> = vec![0; n + 1];

    for i in 1..=m {
        curr[0] = i;
        for j in 1..=n {
            let cost = if a_chars[i - 1] == b_chars[j - 1] { 0 } else { 1 };
            curr[j] = (prev[j] + 1)
                .min(curr[j - 1] + 1)
                .min(prev[j - 1] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }

    prev[n]
}

fn lookup_dictionary(word: &str, lang: IndicLanguage) -> Option<Vec<&'static str>> {
    let lower = word.to_lowercase();
    match lang {
        IndicLanguage::Hindi | IndicLanguage::Marathi => match lower.as_str() {
            "namaste" => Some(vec!["नमस्ते", "नमस्कार", "प्रणाम"]),
            "kaise" => Some(vec!["कैसे", "कैसी", "कैसा"]),
            "ho" => Some(vec!["हो", "हों", "हूँ"]),
            "kya" => Some(vec!["क्या", "क्यों"]),
            "hai" => Some(vec!["है", "हैं", "हाय"]),
            "main" | "mai" => Some(vec!["मैं", "में", "माई"]),
            "mein" => Some(vec!["में", "मैं"]),
            "tum" => Some(vec!["तुम", "तुम्हें", "तुम्हारा"]),
            "aap" => Some(vec!["आप", "आपका", "आपको"]),
            "hum" => Some(vec!["हम", "हमें", "हमारा"]),
            "woh" | "wo" => Some(vec!["वह", "वो"]),
            "yeh" | "ye" => Some(vec!["यह", "ये"]),
            "kaun" => Some(vec!["कौन"]),
            "kahan" => Some(vec!["कहाँ", "कहां"]),
            "kab" => Some(vec!["कब"]),
            "kyun" | "kyon" => Some(vec!["क्यों"]),
            "lekin" => Some(vec!["लेकिन", "मगर"]),
            "magar" => Some(vec!["मगर", "लेकिन"]),
            "phir" | "fir" => Some(vec!["फिर"]),
            "abhi" => Some(vec!["अभी"]),
            "aaj" => Some(vec!["आज"]),
            "kal" => Some(vec!["कल"]),
            "subah" => Some(vec!["सुबह", "सवेरा"]),
            "shaam" | "sham" => Some(vec!["शाम", "संध्या"]),
            "bhai" => Some(vec!["भाई", "भैया", "भाईजान"]),
            "behen" | "bahan" => Some(vec!["बहन", "दीदी"]),
            "beta" => Some(vec!["बेटा"]),
            "beti" => Some(vec!["बेटी"]),
            "yaar" => Some(vec!["यार", "यारों"]),
            "dost" => Some(vec!["दोस्त", "मित्र"]),
            "dosti" => Some(vec!["दोस्ती", "मित्रता"]),
            "dushman" => Some(vec!["दुश्मन", "शत्रु"]),
            "parivaar" | "parivar" => Some(vec!["परिवार"]),
            "rishta" => Some(vec!["रिश्ता", "संबंध"]),
            "dil" => Some(vec!["दिल", "दिलों"]),
            "pyaar" | "pyar" => Some(vec!["प्यार", "प्रेम"]),
            "mohabbat" => Some(vec!["मोहब्बत", "मुहब्बत"]),
            "ishq" => Some(vec!["इश्क़", "इश्क"]),
            "zindagi" => Some(vec!["ज़िंदगी", "जिंदगी"]),
            "duniya" => Some(vec!["दुनिया", "जग"]),
            "insaan" | "insan" => Some(vec!["इंसान", "मनुष्य"]),
            "mumbai" => Some(vec!["मुंबई", "मुम्बई"]),
            "dilli" | "delhi" => Some(vec!["दिल्ली", "दिली"]),
            "pune" => Some(vec!["पुणे"]),
            "shahar" | "shehar" => Some(vec!["शहर", "नगर"]),
            "gaon" => Some(vec!["गाँव", "गांव"]),
            "ghar" => Some(vec!["घर", "मकान"]),
            "sadak" => Some(vec!["सड़क", "रास्ता"]),
            "darwaza" => Some(vec!["दरवाज़ा", "दरवाजा"]),
            "khidki" => Some(vec!["खिड़की"]),
            "raat" => Some(vec!["रात", "रात्रि"]),
            "din" => Some(vec!["दिन", "दिनों"]),
            "train" => Some(vec!["ट्रेन", "रेलगाड़ी"]),
            "station" => Some(vec!["स्टेशन"]),
            "police" => Some(vec!["पुलिस"]),
            "kahani" => Some(vec!["कहानी", "कहानियाँ"]),
            "patkatha" => Some(vec!["पटकथा"]),
            "drishya" => Some(vec!["दृश्य"]),
            "samvaad" | "samvad" => Some(vec!["संवाद"]),
            "interval" => Some(vec!["इंटरवल", "मध्यांतर"]),
            "climax" => Some(vec!["क्लाइमैक्स", "चरम"]),
            "camera" => Some(vec!["कैमरा"]),
            "action" => Some(vec!["एक्शन"]),
            "film" => Some(vec!["फ़िल्म", "फिल्म"]),
            "parda" => Some(vec!["पर्दा"]),
            "gaana" | "gana" => Some(vec!["गाना", "गीत"]),
            "sangeet" => Some(vec!["संगीत"]),
            "nahi" | "nahin" => Some(vec!["नहीं", "ना"]),
            "haan" | "han" => Some(vec!["हाँ", "हां"]),
            "accha" | "achha" => Some(vec!["अच्छा", "अच्छे"]),
            "theek" | "thik" => Some(vec!["ठीक"]),
            "chalo" => Some(vec!["चलो", "चलिये"]),
            "ruko" => Some(vec!["रुको", "रुकिए"]),
            "dekho" => Some(vec!["देखो", "देखिए"]),
            "suno" => Some(vec!["सुनो", "सुनिए"]),
            "bolo" => Some(vec!["बोलो", "बोलिए"]),
            "aao" => Some(vec!["आओ", "आइए"]),
            "jao" => Some(vec!["जाओ", "जाइए"]),
            "waqt" => Some(vec!["वक़्त", "समय"]),
            "khamoshi" => Some(vec!["ख़ामोशी", "सन्नाटा"]),
            "baarish" => Some(vec!["बारिश", "बरसात"]),
            "sapna" => Some(vec!["सपना", "ख़्वाब"]),
            "aansu" => Some(vec!["आँसू", "आंसू"]),
            "hansi" => Some(vec!["हँसी", "हंसी"]),
            "awaaz" | "awaz" => Some(vec!["आवाज़", "आवाज"]),
            "chehra" => Some(vec!["चेहरा"]),
            "aankhen" => Some(vec!["आँखें", "आंखें"]),
            "sach" => Some(vec!["सच", "सत्य"]),
            "jhooth" | "jhoot" => Some(vec!["झूठ"]),
            "maafi" => Some(vec!["माफ़ी", "माफी"]),
            "vaada" | "wada" => Some(vec!["वादा", "वचन"]),
            "kasam" => Some(vec!["क़सम", "कसम"]),
            "khatra" => Some(vec!["ख़तरा", "खतरा"]),
            "himmat" => Some(vec!["हिम्मत", "साहस"]),
            "junoon" => Some(vec!["जुनून"]),
            "intezaar" | "intezar" => Some(vec!["इंतज़ार", "इंतजार"]),
            "safar" => Some(vec!["सफ़र", "सफर"]),
            "manzil" => Some(vec!["मंज़िल", "मंजिल"]),
            "aazaadi" | "azadi" => Some(vec!["आज़ादी", "आजादी"]),
            "kismat" => Some(vec!["क़िस्मत", "किस्मत"]),
            "chai" => Some(vec!["चाय"]),
            "paani" | "pani" => Some(vec!["पानी", "जल"]),
            "samundar" => Some(vec!["समंदर", "समुद्र"]),
            "aasmaan" | "asman" => Some(vec!["आसमान", "आकाश"]),
            "chaand" | "chand" => Some(vec!["चाँद", "चांद"]),
            "shukriya" => Some(vec!["शुक्रिया", "धन्यवाद"]),
            "dhanyavaad" | "dhanyawad" => Some(vec!["धन्यवाद"]),
            "alvida" => Some(vec!["अलविदा"]),
            "maa" => Some(vec!["माँ", "माता"]),
            "baba" => Some(vec!["बाबा", "पिताजी"]),
            "aai" => Some(vec!["आई"]),
            "bhau" => Some(vec!["भाऊ"]),
            "aahe" => Some(vec!["आहे"]),
            "kasa" => Some(vec!["कसा", "कसे"]),
            "goshta" => Some(vec!["गोष्ट"]),
            _ => None,
        },
        IndicLanguage::Tamil => match lower.as_str() {
            "vanakkam" => Some(vec!["வணக்கம்"]),
            "eppadi" => Some(vec!["எப்படி"]),
            "irukinga" => Some(vec!["இருக்கீங்க"]),
            "naan" => Some(vec!["நான்"]),
            "nee" => Some(vec!["நீ", "நீங்கள்"]),
            "anna" => Some(vec!["அண்ணா"]),
            "thambi" => Some(vec!["தம்பி"]),
            "akka" => Some(vec!["அக்கா"]),
            "thangachi" => Some(vec!["தங்கச்சி"]),
            "kadhal" => Some(vec!["காதல்"]),
            "chennai" => Some(vec!["சென்னை"]),
            "cinema" => Some(vec!["சினிமா"]),
            "amma" => Some(vec!["அம்மா"]),
            "appa" => Some(vec!["அப்பா"]),
            "seri" | "sari" => Some(vec!["சரி"]),
            "illai" | "illa" => Some(vec!["இல்லை", "இல்ல"]),
            "vaanga" => Some(vec!["வாங்க", "வா"]),
            "ponga" => Some(vec!["போங்க", "போ"]),
            "sollu" => Some(vec!["சொல்லு", "சொல்லுங்க"]),
            "paaru" => Some(vec!["பாரு", "பாருங்க"]),
            "kelu" => Some(vec!["கேளு", "கேளுங்க"]),
            "nanban" => Some(vec!["நண்பன்", "தோழன்"]),
            "veedu" => Some(vec!["வீடு"]),
            "ooru" => Some(vec!["ஊரு", "ஊர்"]),
            "mazhai" => Some(vec!["மழை"]),
            "iravu" => Some(vec!["இரவு"]),
            "pagal" => Some(vec!["பகல்"]),
            "kanavu" => Some(vec!["கனவு"]),
            "uyir" => Some(vec!["உயிர்"]),
            "manasu" => Some(vec!["மனசு", "மனம்"]),
            "vazhkai" => Some(vec!["வாழ்க்கை"]),
            "payanam" => Some(vec!["பயணம்"]),
            "kathai" => Some(vec!["கதை"]),
            "padam" => Some(vec!["படம்"]),
            "isai" => Some(vec!["இசை"]),
            "paattu" => Some(vec!["பாட்டு"]),
            "nandri" => Some(vec!["நன்றி"]),
            "romba" => Some(vec!["ரொம்ப"]),
            "nalla" => Some(vec!["நல்ல"]),
            "theriyum" => Some(vec!["தெரியும்"]),
            "venum" => Some(vec!["வேணும்"]),
            _ => None,
        },
        IndicLanguage::Telugu => match lower.as_str() {
            "namaskaram" => Some(vec!["నమస్కారం"]),
            "ela" => Some(vec!["ఎలా"]),
            "unnaru" => Some(vec!["ఉన్నారు"]),
            "nenu" => Some(vec!["నేను"]),
            "nuvvu" => Some(vec!["నువ్వు"]),
            "anna" => Some(vec!["అన్న"]),
            "amma" => Some(vec!["అమ్మ"]),
            "nanna" => Some(vec!["నాన్న"]),
            "akka" => Some(vec!["అక్క"]),
            "tammudu" => Some(vec!["తమ్ముడు"]),
            "chelli" => Some(vec!["చెల్లి"]),
            "prema" => Some(vec!["ప్రేమ"]),
            "hyderabad" => Some(vec!["హైదరాబాద్"]),
            "katha" => Some(vec!["కథ"]),
            "avunu" => Some(vec!["అవును"]),
            "kaadu" => Some(vec!["కాదు"]),
            "randi" => Some(vec!["రండి"]),
            "vellandi" => Some(vec!["వెళ్ళండి"]),
            "cheppu" => Some(vec!["చెప్పు", "చెప్పండి"]),
            "chudu" => Some(vec!["చూడు", "చూడండి"]),
            "vinu" => Some(vec!["విను", "వినండి"]),
            "snehitudu" => Some(vec!["స్నేహితుడు"]),
            "illu" => Some(vec!["ఇల్లు"]),
            "varsham" => Some(vec!["వర్షం"]),
            "ratri" => Some(vec!["రాత్రి"]),
            "kala" => Some(vec!["కల"]),
            "pranam" => Some(vec!["ప్రాణం"]),
            "manasu" => Some(vec!["మనసు"]),
            "jeevitam" => Some(vec!["జీవితం"]),
            "prayanam" => Some(vec!["ప్రయాణం"]),
            "cinema" => Some(vec!["సినిమా"]),
            "paata" => Some(vec!["పాట"]),
            "sangeetam" => Some(vec!["సంగీతం"]),
            "dhanyavadalu" => Some(vec!["ధన్యవాదాలు"]),
            "chala" => Some(vec!["చాలా"]),
            "bagundi" => Some(vec!["బాగుంది"]),
            "telusu" => Some(vec!["తెలుసు"]),
            _ => None,
        },
        IndicLanguage::Kannada => match lower.as_str() {
            "namaskara" => Some(vec!["ನಮಸ್ಕಾರ"]),
            "hegiddira" => Some(vec!["ಹೇಗಿದ್ದೀರಾ"]),
            "naanu" => Some(vec!["ನಾನು"]),
            "neevu" => Some(vec!["ನೀವು"]),
            "bengaluru" => Some(vec!["ಬೆಂಗಳೂರು"]),
            "preethi" => Some(vec!["ಪ್ರೀತಿ"]),
            "kathe" => Some(vec!["ಕಥೆ"]),
            "houdu" => Some(vec!["ಹೌದು"]),
            "illa" => Some(vec!["ಇಲ್ಲ"]),
            "banni" => Some(vec!["ಬನ್ನಿ"]),
            "hogi" => Some(vec!["ಹೋಗಿ"]),
            "heli" => Some(vec!["ಹೇಳಿ"]),
            "nodi" => Some(vec!["ನೋಡಿ"]),
            "keli" => Some(vec!["ಕೇಳಿ"]),
            "geleya" => Some(vec!["ಗೆಳೆಯ"]),
            "mane" => Some(vec!["ಮನೆ"]),
            "male" => Some(vec!["ಮಳೆ"]),
            "raatri" => Some(vec!["ರಾತ್ರಿ"]),
            "kanasu" => Some(vec!["ಕನಸು"]),
            "jeevana" => Some(vec!["ಜೀವನ"]),
            "payana" => Some(vec!["ಪಯಣ"]),
            "chitra" => Some(vec!["ಚಿತ್ರ"]),
            "sangeetha" => Some(vec!["ಸಂಗೀತ"]),
            "haadu" => Some(vec!["ಹಾಡು"]),
            "dhanyavada" => Some(vec!["ಧನ್ಯವಾದ"]),
            "tumba" => Some(vec!["ತುಂಬಾ"]),
            "chennagide" => Some(vec!["ಚೆನ್ನಾಗಿದೆ"]),
            "amma" => Some(vec!["ಅಮ್ಮ"]),
            "appa" => Some(vec!["ಅಪ್ಪ"]),
            "anna" => Some(vec!["ಅಣ್ಣ"]),
            _ => None,
        },
        IndicLanguage::Malayalam => match lower.as_str() {
            "namaskaram" => Some(vec!["നമസ്കാരം"]),
            "sukhamano" => Some(vec!["സുഖമാണോ"]),
            "njan" => Some(vec!["ഞാൻ"]),
            "nee" => Some(vec!["നീ", "നിങ്ങൾ"]),
            "kochi" => Some(vec!["കൊച്ചി"]),
            "sneham" => Some(vec!["സ്നേഹം"]),
            "katha" => Some(vec!["കഥ"]),
            "athe" => Some(vec!["അതെ"]),
            "alla" => Some(vec!["അല്ല"]),
            "varoo" => Some(vec!["വരൂ"]),
            "pokoo" => Some(vec!["പോകൂ"]),
            "parayoo" => Some(vec!["പറയൂ"]),
            "kanoo" => Some(vec!["കാണൂ"]),
            "kelkoo" => Some(vec!["കേൾക്കൂ"]),
            "suhruth" => Some(vec!["സുഹൃത്ത്"]),
            "veedu" => Some(vec!["വീട്"]),
            "mazha" => Some(vec!["മഴ"]),
            "raathri" => Some(vec!["രാത്രി"]),
            "swapnam" => Some(vec!["സ്വപ്നം"]),
            "jeevitham" => Some(vec!["ജീവിതം"]),
            "yathra" => Some(vec!["യാത്ര"]),
            "cinema" => Some(vec!["സിനിമ"]),
            "paattu" => Some(vec!["പാട്ട്"]),
            "sangeetham" => Some(vec!["സംഗീതം"]),
            "nanni" => Some(vec!["നന്ദി"]),
            "valare" => Some(vec!["വളരെ"]),
            "amma" => Some(vec!["അമ്മ"]),
            "achan" => Some(vec!["അച്ഛൻ"]),
            "chetta" => Some(vec!["ചേട്ടാ"]),
            _ => None,
        },
        IndicLanguage::Bengali => match lower.as_str() {
            "nomoshkar" | "namaskar" => Some(vec!["নমস্কার"]),
            "kemon" => Some(vec!["কেমন"]),
            "achen" => Some(vec!["আছেন"]),
            "ami" => Some(vec!["আমি"]),
            "tumi" => Some(vec!["তুমি"]),
            "kolkata" => Some(vec!["কলকাতা"]),
            "bhalobasha" => Some(vec!["ভালোবাসা"]),
            "golpo" => Some(vec!["গল্প"]),
            "ashun" => Some(vec!["আসুন"]),
            "bolo" => Some(vec!["বলো", "বলুন"]),
            "dekho" => Some(vec!["দেখো", "দেখুন"]),
            "shono" => Some(vec!["শোনো", "শুনুন"]),
            "bondhu" => Some(vec!["বন্ধু"]),
            "bari" => Some(vec!["বাড়ি"]),
            "brishti" => Some(vec!["বৃষ্টি"]),
            "raat" => Some(vec!["রাত"]),
            "din" => Some(vec!["দিন"]),
            "shopno" => Some(vec!["স্বপ্ন"]),
            "jibon" => Some(vec!["জীবন"]),
            "cinema" => Some(vec!["সিনেমা"]),
            "gaan" => Some(vec!["গান"]),
            "shongeet" => Some(vec!["সঙ্গীত"]),
            "dhonnobad" => Some(vec!["ধন্যবাদ"]),
            "bhalo" => Some(vec!["ভালো"]),
            "khub" => Some(vec!["খুব"]),
            "maa" => Some(vec!["মা"]),
            "baba" => Some(vec!["বাবা"]),
            "dada" => Some(vec!["দাদা"]),
            "didi" => Some(vec!["দিদি"]),
            "haan" => Some(vec!["হ্যাঁ"]),
            "na" => Some(vec!["না"]),
            _ => None,
        },
        IndicLanguage::Gujarati => match lower.as_str() {
            "namaste" | "kem" => Some(vec!["નમસ્તે", "કેમ"]),
            "cho" | "chho" => Some(vec!["છો"]),
            "maja" => Some(vec!["મજા", "મજામાં"]),
            "prem" => Some(vec!["પ્રેમ"]),
            "amdavad" => Some(vec!["અમદાવાદ"]),
            "aavo" => Some(vec!["આવો"]),
            "jao" => Some(vec!["જાઓ"]),
            "kaho" => Some(vec!["કહો"]),
            "juo" => Some(vec!["જુઓ"]),
            "sambhalo" => Some(vec!["સાંભળો"]),
            "dost" => Some(vec!["દોસ્ત", "મિત્ર"]),
            "ghar" => Some(vec!["ઘર"]),
            "varsad" => Some(vec!["વરસાદ"]),
            "raat" => Some(vec!["રાત"]),
            "divas" => Some(vec!["દિવસ"]),
            "sapnu" => Some(vec!["સપનું"]),
            "jindagi" => Some(vec!["જિંદગી"]),
            "vaarta" => Some(vec!["વાર્તા"]),
            "geet" => Some(vec!["ગીત"]),
            "sangeet" => Some(vec!["સંગીત"]),
            "aabhar" => Some(vec!["આભાર"]),
            "saru" => Some(vec!["સારું"]),
            "haa" => Some(vec!["હા"]),
            "naa" => Some(vec!["ના"]),
            "bhai" => Some(vec!["ભાઈ"]),
            "ben" => Some(vec!["બેન"]),
            "baa" => Some(vec!["બા"]),
            "bapu" => Some(vec!["બાપુ"]),
            _ => None,
        },
        IndicLanguage::Punjabi => match lower.as_str() {
            "sat" => Some(vec!["ਸਤ"]),
            "sri" => Some(vec!["ਸ੍ਰੀ"]),
            "akal" => Some(vec!["ਅਕਾਲ"]),
            "kiddan" => Some(vec!["ਕਿੱਦਾਂ"]),
            "veere" | "paji" => Some(vec!["ਵੀਰੇ", "ਭਾਜੀ"]),
            "pyaar" => Some(vec!["ਪਿਆਰ"]),
            "aao" => Some(vec!["ਆਓ"]),
            "jao" => Some(vec!["ਜਾਓ"]),
            "dasso" => Some(vec!["ਦੱਸੋ"]),
            "vekho" => Some(vec!["ਵੇਖੋ"]),
            "suno" => Some(vec!["ਸੁਣੋ"]),
            "yaar" => Some(vec!["ਯਾਰ"]),
            "ghar" => Some(vec!["ਘਰ"]),
            "pind" => Some(vec!["ਪਿੰਡ"]),
            "meenh" => Some(vec!["ਮੀਂਹ"]),
            "raat" => Some(vec!["ਰਾਤ"]),
            "din" => Some(vec!["ਦਿਨ"]),
            "supna" => Some(vec!["ਸੁਪਨਾ"]),
            "zindagi" => Some(vec!["ਜ਼ਿੰਦਗੀ"]),
            "kahani" => Some(vec!["ਕਹਾਣੀ"]),
            "geet" => Some(vec!["ਗੀਤ"]),
            "sangeet" => Some(vec!["ਸੰਗੀਤ"]),
            "dhanvaad" => Some(vec!["ਧੰਨਵਾਦ"]),
            "vadiya" => Some(vec!["ਵਧੀਆ"]),
            "theek" => Some(vec!["ਠੀਕ"]),
            "haan" => Some(vec!["ਹਾਂ"]),
            "nahi" => Some(vec!["ਨਹੀਂ"]),
            "maa" => Some(vec!["ਮਾਂ"]),
            "baapu" => Some(vec!["ਬਾਪੂ"]),
            "amritsar" => Some(vec!["ਅੰਮ੍ਰਿਤਸਰ"]),
            "chandigarh" => Some(vec!["ਚੰਡੀਗੜ੍ਹ"]),
            _ => None,
        },
        IndicLanguage::Hinglish | IndicLanguage::English => None,
    }
}

/// Rule-based phonetic vowel/consonant transliterator for arbitrary Roman input into Indic script.
pub fn phonetic_fallback(word: &str, lang: IndicLanguage) -> String {
    if matches!(lang, IndicLanguage::English | IndicLanguage::Hinglish) {
        return word.to_string();
    }

    let lower = word.to_lowercase();
    let bytes = lower.as_bytes();
    let mut out = String::new();
    let mut i = 0;

    while i < bytes.len() {
        let rem = &lower[i..];

        // Digraph consonants
        let matched = if rem.starts_with("ksh") {
            Some(("क्ष", 3))
        } else if rem.starts_with("chh") {
            Some(("छ", 3))
        } else if rem.starts_with("kh") {
            Some(("ख", 2))
        } else if rem.starts_with("gh") {
            Some(("घ", 2))
        } else if rem.starts_with("ch") {
            Some(("च", 2))
        } else if rem.starts_with("jh") {
            Some(("झ", 2))
        } else if rem.starts_with("th") {
            Some(("थ", 2))
        } else if rem.starts_with("dh") {
            Some(("ध", 2))
        } else if rem.starts_with("ph") {
            Some(("फ", 2))
        } else if rem.starts_with("bh") {
            Some(("भ", 2))
        } else if rem.starts_with("sh") {
            Some(("श", 2))
        } else if rem.starts_with("aa") {
            Some((if i == 0 { "आ" } else { "ा" }, 2))
        } else if rem.starts_with("ee") {
            Some((if i == 0 { "ई" } else { "ी" }, 2))
        } else if rem.starts_with("oo") {
            Some((if i == 0 { "ऊ" } else { "ू" }, 2))
        } else if rem.starts_with("ai") {
            Some((if i == 0 { "ऐ" } else { "ै" }, 2))
        } else if rem.starts_with("au") {
            Some((if i == 0 { "औ" } else { "ौ" }, 2))
        } else {
            None
        };

        if let Some((glyph, step)) = matched {
            out.push_str(&adapt_deva_glyph(glyph, lang));
            i += step;
            continue;
        }

        let ch = bytes[i] as char;
        let single = match ch {
            'a' => if i == 0 { "अ" } else { "" },
            'i' => if i == 0 { "इ" } else { "ि" },
            'u' => if i == 0 { "उ" } else { "ु" },
            'e' => if i == 0 { "ए" } else { "े" },
            'o' => if i == 0 { "ओ" } else { "ो" },
            'k' | 'q' | 'c' => "क",
            'g' => "ग",
            'j' | 'z' => "ज",
            't' => "त",
            'd' => "द",
            'n' => "न",
            'p' => "प",
            'f' => "फ",
            'b' => "ब",
            'm' => "म",
            'y' => "य",
            'r' => "र",
            'l' => "ल",
            'v' | 'w' => "व",
            's' => "स",
            'h' => "ह",
            _ => "",
        };

        if !single.is_empty() {
            out.push_str(&adapt_deva_glyph(single, lang));
        } else if !ch.is_ascii_alphabetic() {
            out.push(ch);
        }
        i += 1;
    }

    if out.is_empty() {
        word.to_string()
    } else {
        out
    }
}

/// Converts a Devanagari Unicode string into the target regional Brahmic script block offset where applicable.
fn adapt_deva_glyph(deva: &str, lang: IndicLanguage) -> String {
    let offset: i32 = match lang {
        IndicLanguage::Hindi | IndicLanguage::Marathi | IndicLanguage::Hinglish | IndicLanguage::English => 0,
        IndicLanguage::Bengali => 0x0980 - 0x0900,
        IndicLanguage::Punjabi => 0x0A00 - 0x0900,
        IndicLanguage::Gujarati => 0x0A80 - 0x0900,
        IndicLanguage::Tamil => 0x0B80 - 0x0900,
        IndicLanguage::Telugu => 0x0C00 - 0x0900,
        IndicLanguage::Kannada => 0x0C80 - 0x0900,
        IndicLanguage::Malayalam => 0x0D00 - 0x0900,
    };

    if offset == 0 {
        return deva.to_string();
    }

    deva.chars()
        .map(|c| {
            let code = c as i32;
            if (0x0900..=0x097F).contains(&code) {
                char::from_u32((code + offset) as u32).unwrap_or(c)
            } else {
                c
            }
        })
        .collect()
}

pub fn transliterate_word(word: &str, lang: IndicLanguage) -> TransliterationResult {
    let start = Instant::now();
    let trimmed = word.trim();
    if trimmed.is_empty() || matches!(lang, IndicLanguage::English) {
        return TransliterationResult {
            input: word.to_string(),
            primary: word.to_string(),
            candidates: vec![word.to_string()],
            language: lang,
            latency_micros: start.elapsed().as_micros() as u64,
        };
    }

    if matches!(lang, IndicLanguage::Hinglish) {
        // In Hinglish mode, keep Roman as primary and offer Devanagari as secondary candidate
        let hi_cands = lookup_dictionary(trimmed, IndicLanguage::Hindi)
            .map(|v| v.into_iter().map(String::from).collect::<Vec<_>>())
            .unwrap_or_else(|| vec![phonetic_fallback(trimmed, IndicLanguage::Hindi)]);
        let mut candidates = vec![trimmed.to_string()];
        candidates.extend(hi_cands);
        return TransliterationResult {
            input: word.to_string(),
            primary: trimmed.to_string(),
            candidates,
            language: lang,
            latency_micros: start.elapsed().as_micros() as u64,
        };
    }

    if let Some(dict_matches) = lookup_dictionary(trimmed, lang) {
        let mut candidates: Vec<String> = dict_matches.into_iter().map(String::from).collect();
        let primary = candidates[0].clone();
        candidates.push(trimmed.to_string());
        return TransliterationResult {
            input: word.to_string(),
            primary,
            candidates,
            language: lang,
            latency_micros: start.elapsed().as_micros() as u64,
        };
    }

    let phonetic = phonetic_fallback(trimmed, lang);
    let candidates = vec![phonetic.clone(), trimmed.to_string()];

    TransliterationResult {
        input: word.to_string(),
        primary: phonetic,
        candidates,
        language: lang,
        latency_micros: start.elapsed().as_micros() as u64,
    }
}
