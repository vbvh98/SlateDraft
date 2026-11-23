use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_BACKUPS_PER_PROJECT: usize = 10;
const MAX_RECENT_PROJECTS: usize = 10;
const BACKUPS_DIR_NAME: &str = "slatedraft-backups";
const RECENT_PROJECTS_FILE: &str = "slatedraft-recent.json";

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

fn sanitize_slug(slug: &str) -> String {
    let cleaned: String = slug
        .trim()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect();

    let collapsed = cleaned.trim_matches('-').to_string();
    if collapsed.is_empty() {
        "untitled".to_string()
    } else {
        collapsed
    }
}

fn current_timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn next_unique_suffix() -> String {
    let pid = std::process::id();
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let seq = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{pid}-{nanos}-{seq}")
}

fn write_atomic(target: &Path, content: &str) -> Result<PathBuf, String> {
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory {}: {e}", parent.display()))?;
        }
    }

    let file_name = target
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| format!("Invalid target path: {}", target.display()))?;

    let tmp_name = format!(".{file_name}.tmp.{}", next_unique_suffix());
    let tmp_path = match target.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent.join(tmp_name),
        _ => PathBuf::from(tmp_name),
    };

    let write_res = (|| -> Result<(), std::io::Error> {
        let mut file = fs::File::create(&tmp_path)?;
        file.write_all(content.as_bytes())?;
        file.sync_all()?;
        Ok(())
    })();

    if let Err(err) = write_res {
        let _ = fs::remove_file(&tmp_path);
        return Err(format!("Failed to write temporary file {}: {err}", tmp_path.display()));
    }

    if let Err(err) = fs::rename(&tmp_path, target) {
        let _ = fs::remove_file(&tmp_path);
        return Err(format!(
            "Failed to atomically move {} to {}: {err}",
            tmp_path.display(),
            target.display()
        ));
    }

    Ok(fs::canonicalize(target).unwrap_or_else(|_| target.to_path_buf()))
}

/// Atomically writes a `.slatedraft` project file via a sibling temporary file and rename,
/// returning the canonical path string.
pub fn save_project_file(path: String, content: String) -> Result<String, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Project file path cannot be empty".to_string());
    }

    let canonical = write_atomic(Path::new(trimmed), &content)?;
    Ok(canonical.to_string_lossy().into_owned())
}

/// Loads a `.slatedraft` project file from disk as UTF-8 text.
pub fn load_project_file(path: String) -> Result<String, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Project file path cannot be empty".to_string());
    }

    fs::read_to_string(trimmed)
        .map_err(|e| format!("Failed to read project file {trimmed}: {e}"))
}

fn default_backups_dir() -> PathBuf {
    std::env::temp_dir().join(BACKUPS_DIR_NAME)
}

fn default_recent_file() -> PathBuf {
    std::env::temp_dir().join(RECENT_PROJECTS_FILE)
}

pub(crate) fn write_backup_snapshot_in_dir(
    backups_dir: &Path,
    project_slug: &str,
    content: &str,
) -> Result<String, String> {
    fs::create_dir_all(backups_dir).map_err(|e| {
        format!(
            "Failed to create backup directory {}: {e}",
            backups_dir.display()
        )
    })?;

    let slug = sanitize_slug(project_slug);
    let ts = current_timestamp_millis();
    let seq = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
    let filename = format!("{slug}-{ts:020}-{seq:06}.slatedraft");
    let backup_path = backups_dir.join(filename);

    let canonical = write_atomic(&backup_path, content)?;

    // Prune older snapshots beyond MAX_BACKUPS_PER_PROJECT for this project slug
    let mut matching = collect_project_backups(backups_dir, &slug)?;
    // Sorted newest-first; remove everything after the latest MAX_BACKUPS_PER_PROJECT
    if matching.len() > MAX_BACKUPS_PER_PROJECT {
        for stale in matching.drain(MAX_BACKUPS_PER_PROJECT..) {
            let _ = fs::remove_file(stale);
        }
    }

    Ok(canonical.to_string_lossy().into_owned())
}

fn collect_project_backups(backups_dir: &Path, slug: &str) -> Result<Vec<PathBuf>, String> {
    if !backups_dir.exists() {
        return Ok(Vec::new());
    }

    let prefix = format!("{slug}-");
    let mut entries: Vec<(String, PathBuf)> = Vec::new();

    let read_dir = fs::read_dir(backups_dir).map_err(|e| {
        format!(
            "Failed to read backup directory {}: {e}",
            backups_dir.display()
        )
    })?;

    for entry in read_dir {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with(&prefix) && name.ends_with(".slatedraft") {
                entries.push((name.to_string(), path));
            }
        }
    }

    // Newest first (timestamps are zero-padded to 20 digits + 6-digit monotonic sequence)
    entries.sort_by(|a, b| b.0.cmp(&a.0));
    Ok(entries.into_iter().map(|(_, p)| p).collect())
}

pub(crate) fn list_backup_snapshots_in_dir(
    backups_dir: &Path,
    project_slug: &str,
) -> Result<Vec<String>, String> {
    let slug = sanitize_slug(project_slug);
    let paths = collect_project_backups(backups_dir, &slug)?;
    Ok(paths
        .into_iter()
        .map(|p| {
            fs::canonicalize(&p)
                .unwrap_or(p)
                .to_string_lossy()
                .into_owned()
        })
        .collect())
}

/// Writes a timestamped `.slatedraft` backup snapshot under `temp_dir/slatedraft-backups`,
/// retaining only the latest 10 snapshots for the given project slug.
pub fn write_backup_snapshot(project_slug: String, content: String) -> Result<String, String> {
    write_backup_snapshot_in_dir(&default_backups_dir(), &project_slug, &content)
}

/// Lists `.slatedraft` backup snapshots for the given project slug, newest first.
pub fn list_backup_snapshots(project_slug: String) -> Result<Vec<String>, String> {
    list_backup_snapshots_in_dir(&default_backups_dir(), &project_slug)
}

pub(crate) fn get_recent_projects_from(recent_file: &Path) -> Result<Vec<String>, String> {
    if !recent_file.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(recent_file).map_err(|e| {
        format!(
            "Failed to read recent projects file {}: {e}",
            recent_file.display()
        )
    })?;

    if raw.trim().is_empty() {
        return Ok(Vec::new());
    }

    let mut list: Vec<String> = serde_json::from_str(&raw).map_err(|e| {
        format!(
            "Failed to parse recent projects JSON {}: {e}",
            recent_file.display()
        )
    })?;
    list.truncate(MAX_RECENT_PROJECTS);
    Ok(list)
}

pub(crate) fn record_recent_project_in(
    recent_file: &Path,
    path: &str,
) -> Result<Vec<String>, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Recent project path cannot be empty".to_string());
    }

    let mut list = get_recent_projects_from(recent_file).unwrap_or_default();
    list.retain(|existing| existing != trimmed);
    list.insert(0, trimmed.to_string());
    list.truncate(MAX_RECENT_PROJECTS);

    let serialized = serde_json::to_string_pretty(&list)
        .map_err(|e| format!("Failed to serialize recent projects: {e}"))?;
    write_atomic(recent_file, &serialized)?;

    Ok(list)
}

/// Returns up to 10 recently opened project paths from `temp_dir/slatedraft-recent.json`.
pub fn get_recent_projects() -> Result<Vec<String>, String> {
    get_recent_projects_from(&default_recent_file())
}

/// Records a project path as most recently used in `temp_dir/slatedraft-recent.json`
/// (deduplicated, capped at 10 unique paths) and returns the updated list.
pub fn record_recent_project(path: String) -> Result<Vec<String>, String> {
    record_recent_project_in(&default_recent_file(), &path)
}
