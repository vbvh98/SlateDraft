use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ElementType {
    SceneHeading,
    Action,
    Character,
    Parenthetical,
    Dialogue,
    Transition,
    Shot,
    SongLyric,
    Note,
    SectionAct,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IndicLanguage {
    Hindi,
    Tamil,
    Telugu,
    Kannada,
    Malayalam,
    Marathi,
    Bengali,
    Gujarati,
    Punjabi,
    Hinglish,
    English,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RevisionColor {
    White,
    Blue,
    Pink,
    Yellow,
    Green,
    Goldenrod,
    Buff,
    Salmon,
    Cherry,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NavarasaTag {
    Shringara, // Love / Romance
    Hasya,     // Comedy / Joy
    Karuna,    // Pathos / Grief
    Raudra,    // Fury / Conflict
    Veera,     // Heroism / Resolve
    Bhayanaka, // Terror / Suspense
    Bibhatsa,  // Disgust / Gritty
    Adbhuta,   // Wonder / Reveal
    Shanta,    // Peace / Resolution
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProductionTags {
    pub props: Vec<String>,
    pub costumes: Vec<String>,
    pub vfx: Vec<String>,
    pub stunts: Vec<String>,
    pub extras: Vec<String>,
    pub vehicles: Vec<String>,
    pub songs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptBlock {
    pub id: String,
    pub element_type: ElementType,
    pub text: String,
    pub scene_number: Option<String>,
    pub locked: bool,
    pub omitted: bool,
    pub revision_color: RevisionColor,
    pub is_dual_dialogue: bool,
    pub synopsis: Option<String>,
    pub rasa: Option<NavarasaTag>,
    pub act_marker: Option<String>,
    pub production_tags: Option<ProductionTags>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransliterationResult {
    pub input: String,
    pub primary: String,
    pub candidates: Vec<String>,
    pub language: IndicLanguage,
    pub latency_micros: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterAnalytics {
    pub name: String,
    pub dialogue_blocks: usize,
    pub word_count: usize,
    pub scene_appearances: usize,
    pub estimated_speaking_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationAnalytics {
    pub location: String,
    pub int_ext: String,
    pub scene_count: usize,
    pub day_scenes: usize,
    pub night_scenes: usize,
    pub total_eighths: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptAnalyticsReport {
    pub total_blocks: usize,
    pub total_scenes: usize,
    pub total_words: usize,
    pub total_pages: f64,
    pub total_eighths: usize,
    pub formatted_eighths: String,
    pub estimated_runtime_minutes: f64,
    pub latin_standard_minutes: f64,
    pub indic_calibration_factor: f64,
    pub dialogue_percentage: f64,
    pub action_percentage: f64,
    pub song_count: usize,
    pub characters: Vec<CharacterAnalytics>,
    pub locations: Vec<LocationAnalytics>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FdxTitlePageMeta {
    pub title: Option<String>,
    pub written_by: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDiffEntry {
    pub status: String,
    pub element_type: ElementType,
    pub before_text: Option<String>,
    pub after_text: Option<String>,
    pub scene_number: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDiffResult {
    pub added_count: usize,
    pub removed_count: usize,
    pub modified_count: usize,
    pub changed_scene_numbers: Vec<String>,
    pub entries: Vec<SnapshotDiffEntry>,
}
