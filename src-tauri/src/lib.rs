pub mod analytics;
pub mod formats;
pub mod models;
pub mod project_io;
pub mod revisions;
pub mod transliteration;

/// IPC commands exposed to the TypeScript UI. Kept in a dedicated module because
/// `#[tauri::command]` on `pub fn` at the crate root collides with Tauri's generated macros.
pub mod commands {
    use crate::models::{IndicLanguage, ScriptAnalyticsReport, ScriptBlock, TransliterationResult};
    use crate::{analytics, formats, project_io, revisions, transliteration};

    /// Local sub-millisecond word transliteration across 9 Indic scripts + Hinglish
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn local_transliterate_word(word: String, language: IndicLanguage) -> Result<TransliterationResult, String> {
        Ok(transliteration::transliterate_word(&word, language))
    }

    /// Export script blocks to Fountain (.fountain)
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn export_script_fountain(title: String, author: String, blocks: Vec<ScriptBlock>) -> Result<String, String> {
        Ok(formats::export_to_fountain(&title, &author, &blocks))
    }

    /// Export script blocks to Final Draft 13 (.fdx) XML
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn export_script_fdx(title: String, blocks: Vec<ScriptBlock>) -> Result<String, String> {
        Ok(formats::export_to_fdx(&title, &blocks))
    }

    /// Parse unstructured / Fountain text into structured ScriptBlocks
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn parse_script_text(raw: String) -> Result<Vec<ScriptBlock>, String> {
        Ok(formats::parse_smart_script_text(&raw))
    }

    /// Compute empirical Indic page-timing, 1/8th page counts, and breakdown analytics
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn compute_script_analytics(blocks: Vec<ScriptBlock>, language: IndicLanguage) -> Result<ScriptAnalyticsReport, String> {
        Ok(analytics::analyze_script(&blocks, language))
    }

    /// Lock scene numbers and generate A/B sub-scene indices
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn update_scene_locks(mut blocks: Vec<ScriptBlock>, lock_mode: bool) -> Result<Vec<ScriptBlock>, String> {
        revisions::recalculate_scene_numbers(&mut blocks, lock_mode);
        Ok(blocks)
    }

    /// Assistive dialogue translation (local phrase lexicon; model-backed engine planned)
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn translate_script_line(text: String, target_language: IndicLanguage) -> Result<String, String> {
        Ok(revisions::translate_dialogue_line(&text, target_language))
    }

    /// Atomically save a `.slatedraft` project file to disk
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn save_project_file(path: String, content: String) -> Result<String, String> {
        project_io::save_project_file(path, content)
    }

    /// Load a `.slatedraft` project file from disk
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn load_project_file(path: String) -> Result<String, String> {
        project_io::load_project_file(path)
    }

    /// Write a timestamped rolling `.slatedraft` backup snapshot (keeps latest 10 per project)
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn write_backup_snapshot(project_slug: String, content: String) -> Result<String, String> {
        project_io::write_backup_snapshot(project_slug, content)
    }

    /// List rolling `.slatedraft` backup snapshots for a project, newest first
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn list_backup_snapshots(project_slug: String) -> Result<Vec<String>, String> {
        project_io::list_backup_snapshots(project_slug)
    }

    /// Retrieve up to 10 recently opened project paths
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn get_recent_projects() -> Result<Vec<String>, String> {
        project_io::get_recent_projects()
    }

    /// Record a project path as most recently used (max 10 unique paths)
    #[cfg_attr(feature = "desktop", tauri::command)]
    pub fn record_recent_project(path: String) -> Result<Vec<String>, String> {
        project_io::record_recent_project(path)
    }

    /// Open a new independent native SlateDraft Studio desktop window
    #[cfg(feature = "desktop")]
    #[tauri::command]
    pub fn open_new_window(app: tauri::AppHandle) -> Result<(), String> {
        use std::sync::atomic::{AtomicU64, Ordering};
        use std::time::{SystemTime, UNIX_EPOCH};

        static WINDOW_COUNTER: AtomicU64 = AtomicU64::new(1);
        let millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let seq = WINDOW_COUNTER.fetch_add(1, Ordering::Relaxed);
        let label = format!("slatedraft-{millis}-{seq}");

        tauri::WebviewWindowBuilder::new(
            &app,
            label,
            tauri::WebviewUrl::App("index.html".into()),
        )
        .title("SlateDraft Studio")
        .inner_size(1440.0, 900.0)
        .min_inner_size(1024.0, 680.0)
        .build()
        .map(|_| ())
        .map_err(|e| format!("failed to create new window: {e}"))
    }
}

/// Desktop entry point: boots the Tauri window and registers all IPC commands.
#[cfg(feature = "desktop")]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::local_transliterate_word,
            commands::export_script_fountain,
            commands::export_script_fdx,
            commands::parse_script_text,
            commands::compute_script_analytics,
            commands::update_scene_locks,
            commands::translate_script_line,
            commands::save_project_file,
            commands::load_project_file,
            commands::write_backup_snapshot,
            commands::list_backup_snapshots,
            commands::get_recent_projects,
            commands::record_recent_project,
            commands::open_new_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SlateDraft desktop application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ElementType, IndicLanguage, RevisionColor, ScriptBlock};

    #[test]
    fn test_hindi_and_regional_transliteration() {
        let res = transliteration::transliterate_word("namaste", IndicLanguage::Hindi);
        assert_eq!(res.primary, "नमस्ते");
        assert!(res.candidates.contains(&"नमस्कार".to_string()));
        assert!(res.latency_micros < 5000);

        let tamil = transliteration::transliterate_word("vanakkam", IndicLanguage::Tamil);
        assert_eq!(tamil.primary, "வணக்கம்");

        let telugu = transliteration::transliterate_word("namaskaram", IndicLanguage::Telugu);
        assert_eq!(telugu.primary, "నమస్కారం");
    }

    #[test]
    fn test_levenshtein_distance() {
        assert_eq!(transliteration::levenshtein_distance("kaise", "kaise"), 0);
        assert_eq!(transliteration::levenshtein_distance("namaste", "namste"), 1);
        assert_eq!(transliteration::levenshtein_distance("bhai", "bhaai"), 1);
    }

    #[test]
    fn test_fountain_and_fdx_roundtrip() {
        let sample = vec![
            ScriptBlock {
                id: "1".to_string(),
                element_type: ElementType::SceneHeading,
                text: "INT. CHURCHGATE STATION - NIGHT".to_string(),
                scene_number: Some("1".to_string()),
                locked: true,
                omitted: false,
                revision_color: RevisionColor::Blue,
                is_dual_dialogue: false,
                synopsis: Some("Kabir misses the last Virar fast local.".to_string()),
                rasa: None,
                act_marker: None,
                production_tags: None,
            },
            ScriptBlock {
                id: "2".to_string(),
                element_type: ElementType::Character,
                text: "KABIR".to_string(),
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::Blue,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            },
            ScriptBlock {
                id: "3".to_string(),
                element_type: ElementType::Dialogue,
                text: "रुको! यह आखिरी ट्रेन है!".to_string(),
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::Blue,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            },
        ];

        let fountain = formats::export_to_fountain("Mumbai Local", "Vikramaditya", &sample);
        assert!(fountain.contains("INT. CHURCHGATE STATION - NIGHT #1#"));
        assert!(fountain.contains("KABIR"));
        assert!(fountain.contains("रुको! यह आखिरी ट्रेन है!"));

        let fdx = formats::export_to_fdx("Mumbai Local", &sample);
        assert!(fdx.contains("<FinalDraft DocumentType=\"Script\""));
        assert!(fdx.contains("Paragraph Type=\"Scene Heading\" Number=\"1\""));
        assert!(fdx.contains("रुको! यह आखिरी ट्रेन है!"));

        let parsed = formats::parse_smart_script_text(&fountain);
        assert!(parsed.len() >= 3);
        assert_eq!(parsed[0].element_type, ElementType::SceneHeading);
    }

    #[test]
    fn test_scene_locking_a_pages() {
        let mut blocks = vec![
            ScriptBlock {
                id: "s1".to_string(),
                element_type: ElementType::SceneHeading,
                text: "INT. CAFE - DAY".to_string(),
                scene_number: Some("10".to_string()),
                locked: true,
                omitted: false,
                revision_color: RevisionColor::White,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            },
            ScriptBlock {
                id: "s2".to_string(),
                element_type: ElementType::SceneHeading,
                text: "EXT. STREET - DAY".to_string(),
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::Blue,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            },
        ];

        revisions::recalculate_scene_numbers(&mut blocks, true);
        assert_eq!(blocks[0].scene_number.as_deref(), Some("10"));
        assert_eq!(blocks[1].scene_number.as_deref(), Some("10A"));
    }

    #[test]
    fn test_empirical_indic_analytics() {
        let blocks = formats::parse_smart_script_text(
            "INT. STUDIO - DAY\n\nA quiet room.\n\nMEERA\nनमस्ते, क्या हम शुरू करें?\n",
        );
        let report = analytics::analyze_script(&blocks, IndicLanguage::Hindi);
        assert_eq!(report.total_scenes, 1);
        assert_eq!(report.indic_calibration_factor, 0.88);
        assert!(!report.characters.is_empty());
        assert_eq!(report.characters[0].name, "MEERA");
    }

    #[test]
    fn test_project_save_and_load_roundtrip() {
        let base = std::env::temp_dir().join(format!(
            "slatedraft-test-io-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&base);
        let project_path = base.join("nested").join("monsoon-express.slatedraft");
        let payload = r#"{"title":"Monsoon Express","language":"Hindi","blocks":[]}"#.to_string();

        let saved_path = commands::save_project_file(
            project_path.to_string_lossy().into_owned(),
            payload.clone(),
        )
        .expect("save_project_file should succeed");

        assert!(std::path::Path::new(&saved_path).exists());

        let loaded = commands::load_project_file(saved_path)
            .expect("load_project_file should succeed");
        assert_eq!(loaded, payload);

        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn test_backup_snapshot_rotation() {
        let backup_dir = std::env::temp_dir().join(format!(
            "slatedraft-test-backups-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&backup_dir);

        let mut written_paths = Vec::new();
        for i in 1..=13 {
            let content = format!(r#"{{"revision":{i}}}"#);
            let p = project_io::write_backup_snapshot_in_dir(&backup_dir, "Mumbai Local!", &content)
                .expect("write_backup_snapshot_in_dir should succeed");
            written_paths.push(p);
        }

        // Write a backup for a different project to ensure isolation
        project_io::write_backup_snapshot_in_dir(&backup_dir, "other-script", "{}")
            .expect("other project backup should succeed");

        let snapshots = project_io::list_backup_snapshots_in_dir(&backup_dir, "Mumbai Local!")
            .expect("list_backup_snapshots_in_dir should succeed");

        assert_eq!(snapshots.len(), 10, "should retain only the latest 10 backups");
        // Newest first: snapshots[0] must be the 13th written snapshot
        assert_eq!(snapshots[0], written_paths[12]);
        assert_eq!(snapshots[9], written_paths[3]);

        // Verify oldest 3 were deleted from disk
        for stale in &written_paths[0..3] {
            assert!(!std::path::Path::new(stale).exists());
        }

        let newest_content = commands::load_project_file(snapshots[0].clone()).unwrap();
        assert_eq!(newest_content, r#"{"revision":13}"#);

        let _ = std::fs::remove_dir_all(&backup_dir);
    }

    #[test]
    fn test_recent_projects_dedup_and_cap() {
        let recent_file = std::env::temp_dir().join(format!(
            "slatedraft-test-recent-{}.json",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&recent_file);

        assert!(project_io::get_recent_projects_from(&recent_file)
            .unwrap()
            .is_empty());

        for i in 1..=12 {
            let path = format!("/scripts/project-{i}.slatedraft");
            project_io::record_recent_project_in(&recent_file, &path).unwrap();
        }

        // Re-recording an existing entry should move it to the front without duplicating
        let updated = project_io::record_recent_project_in(
            &recent_file,
            "/scripts/project-5.slatedraft",
        )
        .unwrap();

        assert_eq!(updated.len(), 10);
        assert_eq!(updated[0], "/scripts/project-5.slatedraft");
        assert_eq!(updated[1], "/scripts/project-12.slatedraft");

        let reloaded = project_io::get_recent_projects_from(&recent_file).unwrap();
        assert_eq!(reloaded, updated);

        let _ = std::fs::remove_file(&recent_file);
    }
}
