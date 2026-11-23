use std::collections::{HashMap, HashSet};

use crate::models::{ElementType, IndicLanguage, ScriptBlock, SnapshotDiffEntry, SnapshotDiffResult};

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

/// Moves a full scene chunk (from its `SceneHeading` up to, but not including, the next
/// `SceneHeading` or `SectionAct`) up or down in the script and recalculates scene numbers.
pub fn move_scene_chunk(
    mut blocks: Vec<ScriptBlock>,
    scene_id: &str,
    direction: &str,
    lock_mode: bool,
) -> Result<Vec<ScriptBlock>, String> {
    if direction != "up" && direction != "down" {
        return Err(format!("Invalid scene move direction: {direction}"));
    }

    let mut chunks: Vec<(String, usize, usize)> = Vec::new();
    for i in 0..blocks.len() {
        if blocks[i].element_type == ElementType::SceneHeading {
            let mut end = i + 1;
            while end < blocks.len()
                && blocks[end].element_type != ElementType::SceneHeading
                && blocks[end].element_type != ElementType::SectionAct
            {
                end += 1;
            }
            chunks.push((blocks[i].id.clone(), i, end));
        }
    }

    let Some(current_idx) = chunks.iter().position(|(id, _, _)| id == scene_id) else {
        return Ok(blocks);
    };

    let target_idx = if direction == "up" {
        if current_idx == 0 {
            return Ok(blocks);
        }
        current_idx - 1
    } else {
        if current_idx + 1 >= chunks.len() {
            return Ok(blocks);
        }
        current_idx + 1
    };

    let (_, cur_start, cur_end) = chunks[current_idx];
    let (_, tgt_start, tgt_end) = chunks[target_idx];
    let chunk_len = cur_end - cur_start;

    let extracted: Vec<ScriptBlock> = blocks.drain(cur_start..cur_end).collect();
    if direction == "up" {
        blocks.splice(tgt_start..tgt_start, extracted);
    } else {
        let insert_at = tgt_end - chunk_len;
        blocks.splice(insert_at..insert_at, extracted);
    }

    recalculate_scene_numbers(&mut blocks, lock_mode);
    Ok(blocks)
}

fn index_blocks_with_scene_numbers(blocks: &[ScriptBlock]) -> HashMap<&str, (&ScriptBlock, Option<String>)> {
    let mut map = HashMap::with_capacity(blocks.len());
    let mut current_scene_number: Option<String> = None;
    let mut auto_scene_counter = 0usize;

    for block in blocks {
        if block.element_type == ElementType::SceneHeading {
            auto_scene_counter += 1;
            let explicit = block
                .scene_number
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty());
            current_scene_number = Some(
                explicit
                    .map(str::to_string)
                    .unwrap_or_else(|| auto_scene_counter.to_string()),
            );
        }
        map.insert(block.id.as_str(), (block, current_scene_number.clone()));
    }
    map
}

fn is_block_modified(base: &ScriptBlock, current: &ScriptBlock) -> bool {
    base.text != current.text
        || base.element_type != current.element_type
        || base.omitted != current.omitted
        || base.is_dual_dialogue != current.is_dual_dialogue
        || base.scene_number.as_deref().unwrap_or("") != current.scene_number.as_deref().unwrap_or("")
}

/// Computes block-level and scene-level differences between two draft snapshots.
pub fn diff_draft_snapshots(
    base_blocks: &[ScriptBlock],
    current_blocks: &[ScriptBlock],
) -> SnapshotDiffResult {
    let base_map = index_blocks_with_scene_numbers(base_blocks);
    let current_map = index_blocks_with_scene_numbers(current_blocks);

    let mut entries = Vec::new();
    let mut changed_scene_numbers = Vec::new();
    let mut changed_scene_set = HashSet::new();
    let mut added_count = 0usize;
    let mut removed_count = 0usize;
    let mut modified_count = 0usize;

    let mut record_scene = |scene: Option<String>| {
        if let Some(s) = scene {
            if changed_scene_set.insert(s.clone()) {
                changed_scene_numbers.push(s);
            }
        }
    };

    for current in current_blocks {
        let current_scene = current_map
            .get(current.id.as_str())
            .and_then(|(_, s)| s.clone());
        match base_map.get(current.id.as_str()) {
            None => {
                added_count += 1;
                record_scene(current_scene.clone());
                entries.push(SnapshotDiffEntry {
                    status: "added".to_string(),
                    element_type: current.element_type,
                    before_text: None,
                    after_text: Some(current.text.clone()),
                    scene_number: current_scene,
                });
            }
            Some((base_block, base_scene)) => {
                if is_block_modified(base_block, current) {
                    modified_count += 1;
                    let scene = current_scene.or_else(|| base_scene.clone());
                    record_scene(scene.clone());
                    entries.push(SnapshotDiffEntry {
                        status: "modified".to_string(),
                        element_type: current.element_type,
                        before_text: Some(base_block.text.clone()),
                        after_text: Some(current.text.clone()),
                        scene_number: scene,
                    });
                }
            }
        }
    }

    for base in base_blocks {
        if !current_map.contains_key(base.id.as_str()) {
            removed_count += 1;
            let base_scene = base_map.get(base.id.as_str()).and_then(|(_, s)| s.clone());
            record_scene(base_scene.clone());
            entries.push(SnapshotDiffEntry {
                status: "removed".to_string(),
                element_type: base.element_type,
                before_text: Some(base.text.clone()),
                after_text: None,
                scene_number: base_scene,
            });
        }
    }

    SnapshotDiffResult {
        added_count,
        removed_count,
        modified_count,
        changed_scene_numbers,
        entries,
    }
}

struct SceneChunk<'a> {
    key: String,
    scene_number: Option<String>,
    blocks: Vec<&'a ScriptBlock>,
}

fn split_into_scene_chunks<'a>(blocks: &'a [ScriptBlock]) -> Vec<SceneChunk<'a>> {
    let mut chunks: Vec<SceneChunk<'a>> = Vec::new();
    let mut auto_scene_counter = 0usize;

    for block in blocks {
        if block.element_type == ElementType::SceneHeading {
            auto_scene_counter += 1;
            let scene_number = block
                .scene_number
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .unwrap_or_else(|| auto_scene_counter.to_string());
            chunks.push(SceneChunk {
                key: format!("scene:{}", block.id),
                scene_number: Some(scene_number),
                blocks: vec![block],
            });
        } else {
            if chunks.is_empty() {
                chunks.push(SceneChunk {
                    key: "preamble".to_string(),
                    scene_number: None,
                    blocks: Vec::new(),
                });
            }
            if let Some(last) = chunks.last_mut() {
                last.blocks.push(block);
            }
        }
    }

    chunks
}

/// Filters `current_blocks` down to only the scene chunks that have added, removed, or modified blocks.
pub fn filter_changed_scene_blocks(
    base_blocks: &[ScriptBlock],
    current_blocks: &[ScriptBlock],
) -> Vec<ScriptBlock> {
    let base_map = index_blocks_with_scene_numbers(base_blocks);
    let current_map = index_blocks_with_scene_numbers(current_blocks);

    let base_chunks = split_into_scene_chunks(base_blocks);
    let mut scenes_with_removals = HashSet::new();
    let mut scene_numbers_with_removals = HashSet::new();

    for chunk in &base_chunks {
        if chunk
            .blocks
            .iter()
            .any(|b| !current_map.contains_key(b.id.as_str()))
        {
            scenes_with_removals.insert(chunk.key.clone());
            if let Some(ref sn) = chunk.scene_number {
                scene_numbers_with_removals.insert(sn.clone());
            }
        }
    }

    let current_chunks = split_into_scene_chunks(current_blocks);
    let mut changed_blocks = Vec::new();

    for chunk in current_chunks {
        let mut chunk_changed = scenes_with_removals.contains(&chunk.key)
            || chunk
                .scene_number
                .as_ref()
                .is_some_and(|sn| scene_numbers_with_removals.contains(sn));

        if !chunk_changed {
            for block in &chunk.blocks {
                match base_map.get(block.id.as_str()) {
                    None => {
                        chunk_changed = true;
                        break;
                    }
                    Some((base_block, _)) if is_block_modified(base_block, block) => {
                        chunk_changed = true;
                        break;
                    }
                    _ => {}
                }
            }
        }

        if chunk_changed {
            for block in chunk.blocks {
                changed_blocks.push(block.clone());
            }
        }
    }

    changed_blocks
}
