use crate::models::{
    CharacterAnalytics, ElementType, IndicLanguage, LocationAnalytics, ScriptAnalyticsReport,
    ScriptBlock,
};
use std::collections::{HashMap, HashSet};

/// Empirical script timing & breakdown calculator calibrated for Indic scripts and Indian cinema formats.
pub fn analyze_script(blocks: &[ScriptBlock], lang: IndicLanguage) -> ScriptAnalyticsReport {
    let calibration_factor = match lang {
        IndicLanguage::Hindi | IndicLanguage::Marathi => 0.88,
        IndicLanguage::Tamil | IndicLanguage::Malayalam => 1.24,
        IndicLanguage::Telugu | IndicLanguage::Kannada => 1.15,
        IndicLanguage::Bengali | IndicLanguage::Gujarati | IndicLanguage::Punjabi => 0.94,
        IndicLanguage::Hinglish | IndicLanguage::English => 1.00,
    };

    let mut total_words = 0usize;
    let mut dialogue_words = 0usize;
    let mut action_words = 0usize;
    let mut total_scenes = 0usize;
    let mut song_count = 0usize;
    let mut estimated_lines = 0usize;

    let mut char_stats: HashMap<String, (usize, usize, HashSet<usize>)> = HashMap::new();
    let mut loc_stats: HashMap<String, (String, usize, usize, usize, usize)> = HashMap::new();

    let mut current_scene_idx = 0usize;
    let mut current_character: Option<String> = None;
    let mut current_location_key: Option<String> = None;

    for block in blocks {
        if block.omitted {
            continue;
        }
        let words = block.text.split_whitespace().count();
        total_words += words;

        let block_lines = match block.element_type {
            ElementType::SceneHeading => 2,
            ElementType::Action => (words / 10).max(1) + 1,
            ElementType::Character => 1,
            ElementType::Parenthetical => 1,
            ElementType::Dialogue => (words / 7).max(1) + 1,
            ElementType::Transition => 2,
            ElementType::Shot => 2,
            ElementType::SongLyric => block.text.lines().count().max(2) + 1,
            ElementType::Note => 0,
            ElementType::SectionAct => 2,
        };
        estimated_lines += block_lines;

        match block.element_type {
            ElementType::SceneHeading => {
                total_scenes += 1;
                current_scene_idx = total_scenes;
                current_character = None;

                let upper = block.text.trim().to_uppercase();
                let int_ext = if upper.starts_with("INT./EXT.") || upper.starts_with("I/E") {
                    "INT/EXT"
                } else if upper.starts_with("INT.") {
                    "INT"
                } else if upper.starts_with("EXT.") {
                    "EXT"
                } else {
                    "OTHER"
                };

                let is_night = upper.contains("NIGHT")
                    || upper.contains("DUSK")
                    || upper.contains("EVENING")
                    || upper.contains("रात");
                let is_day = !is_night;

                let loc_clean = upper
                    .trim_start_matches("INT./EXT.")
                    .trim_start_matches("INT.")
                    .trim_start_matches("EXT.")
                    .split('-')
                    .next()
                    .unwrap_or(&upper)
                    .trim()
                    .to_string();

                let loc_key = if loc_clean.is_empty() {
                    "UNSPECIFIED LOCATION".to_string()
                } else {
                    loc_clean
                };
                current_location_key = Some(loc_key.clone());

                let entry = loc_stats.entry(loc_key).or_insert((
                    int_ext.to_string(),
                    0,
                    0,
                    0,
                    0,
                ));
                entry.1 += 1;
                if is_day {
                    entry.2 += 1;
                } else {
                    entry.3 += 1;
                }
                entry.4 += 1;
            }
            ElementType::Character => {
                let clean_name = block
                    .text
                    .split('(')
                    .next()
                    .unwrap_or(&block.text)
                    .trim()
                    .to_uppercase();
                if !clean_name.is_empty() {
                    current_character = Some(clean_name.clone());
                    let entry = char_stats
                        .entry(clean_name)
                        .or_insert((0, 0, HashSet::new()));
                    if current_scene_idx > 0 {
                        entry.2.insert(current_scene_idx);
                    }
                }
            }
            ElementType::Dialogue => {
                dialogue_words += words;
                if let Some(ref cname) = current_character {
                    if let Some(entry) = char_stats.get_mut(cname) {
                        entry.0 += 1;
                        entry.1 += words;
                    }
                }
            }
            ElementType::Action | ElementType::Shot => {
                action_words += words;
            }
            ElementType::SongLyric => {
                song_count += 1;
                dialogue_words += words;
            }
            _ => {}
        }

        if let Some(ref lkey) = current_location_key {
            if let Some(lentry) = loc_stats.get_mut(lkey) {
                lentry.4 += (block_lines / 7).max(1);
            }
        }
    }

    // Standard screenplay page = 54 lines; 1 page = 8 eighths
    let total_pages = ((estimated_lines as f64) / 54.0).max(0.125);
    let total_eighths = ((total_pages * 8.0).round() as usize).max(1);
    let whole_pages = total_eighths / 8;
    let rem_eighths = total_eighths % 8;
    let formatted_eighths = match (whole_pages, rem_eighths) {
        (0, r) => format!("{}/8 pgs", r),
        (w, 0) => format!("{} pgs", w),
        (w, r) => format!("{} {}/8 pgs", w, r),
    };

    let latin_standard_minutes = total_pages;
    let song_bonus_minutes = (song_count as f64) * 0.45;
    let estimated_runtime_minutes =
        (latin_standard_minutes * calibration_factor) + song_bonus_minutes;

    let active_words = (dialogue_words + action_words).max(1) as f64;
    let dialogue_percentage = ((dialogue_words as f64) / active_words) * 100.0;
    let action_percentage = ((action_words as f64) / active_words) * 100.0;

    let mut characters: Vec<CharacterAnalytics> = char_stats
        .into_iter()
        .map(|(name, (d_blocks, w_count, scenes))| CharacterAnalytics {
            name,
            dialogue_blocks: d_blocks,
            word_count: w_count,
            scene_appearances: scenes.len().max(1),
            estimated_speaking_seconds: ((w_count as f64) / 140.0) * 60.0 * calibration_factor,
        })
        .collect();
    characters.sort_by(|a, b| b.word_count.cmp(&a.word_count));

    let mut locations: Vec<LocationAnalytics> = loc_stats
        .into_iter()
        .map(|(location, (int_ext, scene_count, day_scenes, night_scenes, eighths))| {
            LocationAnalytics {
                location,
                int_ext,
                scene_count,
                day_scenes,
                night_scenes,
                total_eighths: eighths.max(1),
            }
        })
        .collect();
    locations.sort_by(|a, b| b.scene_count.cmp(&a.scene_count));

    ScriptAnalyticsReport {
        total_blocks: blocks.len(),
        total_scenes,
        total_words,
        total_pages: (total_pages * 100.0).round() / 100.0,
        total_eighths,
        formatted_eighths,
        estimated_runtime_minutes: (estimated_runtime_minutes * 10.0).round() / 10.0,
        latin_standard_minutes: (latin_standard_minutes * 10.0).round() / 10.0,
        indic_calibration_factor: calibration_factor,
        dialogue_percentage: (dialogue_percentage * 10.0).round() / 10.0,
        action_percentage: (action_percentage * 10.0).round() / 10.0,
        song_count,
        characters,
        locations,
    }
}
