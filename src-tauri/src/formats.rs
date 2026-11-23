use crate::models::{ElementType, FdxTitlePageMeta, RevisionColor, ScriptBlock};

/// Exports structured screenplay blocks to canonical Fountain format.
pub fn export_to_fountain(title: &str, author: &str, blocks: &[ScriptBlock]) -> String {
    let mut out = String::new();
    out.push_str(&format!("Title: {}\nCredit: Written by\nAuthor: {}\nDraft date: 2026\n\n", title, author));

    for block in blocks {
        if block.omitted {
            out.push_str("/* OMITTED SCENE */\n\n");
            continue;
        }
        match block.element_type {
            ElementType::SectionAct => {
                out.push_str(&format!("# {}\n\n", block.text.trim()));
            }
            ElementType::SceneHeading => {
                let heading = block.text.trim().to_uppercase();
                let num_suffix = block
                    .scene_number
                    .as_ref()
                    .map(|n| format!(" #{}#", n))
                    .unwrap_or_default();
                if heading.starts_with("INT.")
                    || heading.starts_with("EXT.")
                    || heading.starts_with("INT/EXT")
                    || heading.starts_with("I/E")
                {
                    out.push_str(&format!("{}{}\n\n", heading, num_suffix));
                } else {
                    out.push_str(&format!(".{}{}\n\n", heading, num_suffix));
                }
                if let Some(syn) = &block.synopsis {
                    if !syn.trim().is_empty() {
                        out.push_str(&format!("= {}\n\n", syn.trim()));
                    }
                }
            }
            ElementType::Action => {
                out.push_str(&format!("{}\n\n", block.text.trim()));
            }
            ElementType::Character => {
                let dual = if block.is_dual_dialogue { " ^" } else { "" };
                out.push_str(&format!("{}{}\n", block.text.trim().to_uppercase(), dual));
            }
            ElementType::Parenthetical => {
                let raw = block.text.trim();
                if raw.starts_with('(') && raw.ends_with(')') {
                    out.push_str(&format!("{}\n", raw));
                } else {
                    out.push_str(&format!("({})\n", raw));
                }
            }
            ElementType::Dialogue => {
                out.push_str(&format!("{}\n\n", block.text.trim()));
            }
            ElementType::Transition => {
                let tr = block.text.trim().to_uppercase();
                if tr.ends_with("TO:") {
                    out.push_str(&format!("{}\n\n", tr));
                } else {
                    out.push_str(&format!("> {}\n\n", tr));
                }
            }
            ElementType::Shot => {
                out.push_str(&format!("!{}\n\n", block.text.trim().to_uppercase()));
            }
            ElementType::SongLyric => {
                for line in block.text.lines() {
                    out.push_str(&format!("~{}\n", line.trim()));
                }
                out.push('\n');
            }
            ElementType::Note => {
                out.push_str(&format!("[[{}]]\n\n", block.text.trim()));
            }
        }
    }

    out.trim_end().to_string() + "\n"
}

/// Exports structured screenplay blocks to Final Draft 12/13 XML (.fdx) with full UTF-8 Indic support.
pub fn export_to_fdx(title: &str, blocks: &[ScriptBlock]) -> String {
    let mut xml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
"#,
    );

    let _ = title;
    for block in blocks {
        let fdx_type = match block.element_type {
            ElementType::SceneHeading => "Scene Heading",
            ElementType::Action => "Action",
            ElementType::Character => "Character",
            ElementType::Parenthetical => "Parenthetical",
            ElementType::Dialogue => "Dialogue",
            ElementType::Transition => "Transition",
            ElementType::Shot => "Shot",
            ElementType::SongLyric => "Lyric",
            ElementType::Note => "General",
            ElementType::SectionAct => "New Act",
        };

        let number_attr = block
            .scene_number
            .as_ref()
            .map(|n| format!(r#" Number="{}""#, xml_escape(n)))
            .unwrap_or_default();

        let dual_attr = if block.is_dual_dialogue {
            r#" DualDialogue="Yes""#
        } else {
            ""
        };

        xml.push_str(&format!(
            r#"    <Paragraph Type="{}"{}{}>
      <Text>{}</Text>
    </Paragraph>
"#,
            fdx_type,
            number_attr,
            dual_attr,
            xml_escape(&block.text)
        ));
    }

    xml.push_str(
        r#"  </Content>
</FinalDraft>
"#,
    );
    xml
}

fn xml_escape(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// Smart Heuristic Paste / Fountain parser: converts unstructured or Fountain text into structured ScriptBlocks.
pub fn parse_smart_script_text(raw: &str) -> Vec<ScriptBlock> {
    let mut blocks = Vec::new();
    let lines: Vec<&str> = raw.lines().collect();
    let mut i = 0;
    let mut scene_counter = 1usize;
    let mut prev_was_character_or_paren = false;

    while i < lines.len() {
        let line = lines[i].trim();
        i += 1;

        if line.is_empty() {
            prev_was_character_or_paren = false;
            continue;
        }

        // Skip Fountain title page metadata headers
        if (line.starts_with("Title:")
            || line.starts_with("Credit:")
            || line.starts_with("Author:")
            || line.starts_with("Draft date:"))
            && blocks.is_empty()
        {
            continue;
        }

        let id = format!("blk-{}", blocks.len() + 1);

        if let Some(act_title) = line.strip_prefix('#') {
            blocks.push(ScriptBlock {
                id,
                element_type: ElementType::SectionAct,
                text: act_title.trim().to_string(),
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::White,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: Some(act_title.trim().to_string()),
                production_tags: None,
            });
            prev_was_character_or_paren = false;
            continue;
        }

        if let Some(lyric) = line.strip_prefix('~') {
            blocks.push(ScriptBlock {
                id,
                element_type: ElementType::SongLyric,
                text: lyric.trim().to_string(),
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::White,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            });
            prev_was_character_or_paren = false;
            continue;
        }

        let upper = line.to_uppercase();
        if upper.starts_with("INT.")
            || upper.starts_with("EXT.")
            || upper.starts_with("INT/EXT")
            || upper.starts_with("I/E")
            || (line.starts_with('.') && line.len() > 2)
        {
            let cleaned = line.strip_prefix('.').unwrap_or(line).trim().to_uppercase();
            let num = scene_counter.to_string();
            scene_counter += 1;
            blocks.push(ScriptBlock {
                id,
                element_type: ElementType::SceneHeading,
                text: cleaned,
                scene_number: Some(num),
                locked: false,
                omitted: false,
                revision_color: RevisionColor::White,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            });
            prev_was_character_or_paren = false;
            continue;
        }

        if line.starts_with('(') && line.ends_with(')') {
            blocks.push(ScriptBlock {
                id,
                element_type: ElementType::Parenthetical,
                text: line.to_string(),
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::White,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            });
            prev_was_character_or_paren = true;
            continue;
        }

        if upper.ends_with("TO:") || upper == "FADE IN:" || upper == "FADE OUT." || upper == "CUT TO BLACK." {
            blocks.push(ScriptBlock {
                id,
                element_type: ElementType::Transition,
                text: upper,
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::White,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            });
            prev_was_character_or_paren = false;
            continue;
        }

        if prev_was_character_or_paren {
            blocks.push(ScriptBlock {
                id,
                element_type: ElementType::Dialogue,
                text: line.to_string(),
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::White,
                is_dual_dialogue: false,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            });
            prev_was_character_or_paren = false;
            continue;
        }

        // Check if short all-caps Character cue
        let is_all_caps = line.chars().any(|c| c.is_alphabetic())
            && line
                .chars()
                .filter(|c| c.is_alphabetic())
                .all(|c| c.is_uppercase())
            && line.len() <= 38;

        if is_all_caps {
            let is_dual = line.ends_with('^');
            let clean_char = line.trim_end_matches('^').trim().to_string();
            blocks.push(ScriptBlock {
                id,
                element_type: ElementType::Character,
                text: clean_char,
                scene_number: None,
                locked: false,
                omitted: false,
                revision_color: RevisionColor::White,
                is_dual_dialogue: is_dual,
                synopsis: None,
                rasa: None,
                act_marker: None,
                production_tags: None,
            });
            prev_was_character_or_paren = true;
            continue;
        }

        blocks.push(ScriptBlock {
            id,
            element_type: ElementType::Action,
            text: line.to_string(),
            scene_number: None,
            locked: false,
            omitted: false,
            revision_color: RevisionColor::White,
            is_dual_dialogue: false,
            synopsis: None,
            rasa: None,
            act_marker: None,
            production_tags: None,
        });
        prev_was_character_or_paren = false;
    }

    blocks
}

fn xml_unescape(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut rest = input;
    while let Some(amp_idx) = rest.find('&') {
        out.push_str(&rest[..amp_idx]);
        rest = &rest[amp_idx..];
        if let Some(semi_idx) = rest.find(';') {
            let entity = &rest[1..semi_idx];
            let decoded = match entity {
                "amp" => Some('&'),
                "lt" => Some('<'),
                "gt" => Some('>'),
                "quot" => Some('"'),
                "apos" => Some('\''),
                _ if entity.starts_with("#x") || entity.starts_with("#X") => {
                    u32::from_str_radix(&entity[2..], 16)
                        .ok()
                        .and_then(char::from_u32)
                }
                _ if entity.starts_with('#') => entity[1..]
                    .parse::<u32>()
                    .ok()
                    .and_then(char::from_u32),
                _ => None,
            };
            if let Some(ch) = decoded {
                out.push(ch);
                rest = &rest[semi_idx + 1..];
                continue;
            }
        }
        out.push('&');
        rest = &rest[1..];
    }
    out.push_str(rest);
    out
}

/// Finds the inner content of the first `<Tag ...>...</Tag>` (case-insensitive ASCII tag name).
fn find_tag_inner<'a>(xml: &'a str, tag: &str) -> Option<&'a str> {
    let lower = xml.to_ascii_lowercase();
    let open_prefix = format!("<{}", tag.to_ascii_lowercase());
    let close_tag = format!("</{}>", tag.to_ascii_lowercase());
    let mut search_from = 0;
    while let Some(rel_start) = lower[search_from..].find(&open_prefix) {
        let start = search_from + rel_start;
        let after_name = start + open_prefix.len();
        let next_byte = lower.as_bytes().get(after_name).copied();
        if matches!(next_byte, Some(b'>') | Some(b' ') | Some(b'\t') | Some(b'\n') | Some(b'\r')) {
            let open_end = xml[after_name..].find('>')? + after_name;
            let close_start = lower[open_end + 1..].find(&close_tag)? + open_end + 1;
            return Some(&xml[open_end + 1..close_start]);
        }
        search_from = after_name;
    }
    None
}

/// Removes all `<Tag ...>...</Tag>` blocks (case-insensitive ASCII tag name).
fn strip_tag_blocks(xml: &str, tag: &str) -> String {
    let open_prefix = format!("<{}", tag.to_ascii_lowercase());
    let close_tag = format!("</{}>", tag.to_ascii_lowercase());
    let mut result = String::with_capacity(xml.len());
    let mut cursor = 0;
    let lower = xml.to_ascii_lowercase();

    while let Some(rel_start) = lower[cursor..].find(&open_prefix) {
        let start = cursor + rel_start;
        let after_name = start + open_prefix.len();
        let next_byte = lower.as_bytes().get(after_name).copied();
        if matches!(next_byte, Some(b'>') | Some(b' ') | Some(b'\t') | Some(b'\n') | Some(b'\r')) {
            if let Some(rel_open_end) = xml[after_name..].find('>') {
                let open_end = after_name + rel_open_end;
                if let Some(rel_close) = lower[open_end + 1..].find(&close_tag) {
                    result.push_str(&xml[cursor..start]);
                    cursor = open_end + 1 + rel_close + close_tag.len();
                    continue;
                }
            }
        }
        result.push_str(&xml[cursor..after_name]);
        cursor = after_name;
    }
    result.push_str(&xml[cursor..]);
    result
}

fn extract_xml_attr(attrs: &str, attr_name: &str) -> Option<String> {
    let target = attr_name.to_ascii_lowercase();
    let lower = attrs.to_ascii_lowercase();
    let mut search_from = 0;
    while let Some(rel_idx) = lower[search_from..].find(&target) {
        let idx = search_from + rel_idx;
        let boundary_before = idx == 0
            || !lower.as_bytes()[idx - 1].is_ascii_alphanumeric()
                && lower.as_bytes()[idx - 1] != b'_';
        let after_name = idx + target.len();
        if boundary_before {
            let rest = &attrs[after_name..];
            let trimmed = rest.trim_start();
            if let Some(after_eq) = trimmed.strip_prefix('=') {
                let val_start = after_eq.trim_start();
                if let Some(quote) = val_start.chars().next().filter(|&c| c == '"' || c == '\'') {
                    let inner = &val_start[1..];
                    if let Some(end_q) = inner.find(quote) {
                        return Some(xml_unescape(&inner[..end_q]));
                    }
                }
            }
        }
        search_from = after_name;
    }
    None
}

fn strip_all_xml_tags(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut in_tag = false;
    for ch in input.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out
}

fn extract_paragraph_text(inner_xml: &str) -> String {
    let lower = inner_xml.to_ascii_lowercase();
    let mut combined = String::new();
    let mut found_text_tag = false;
    let mut cursor = 0;

    while let Some(rel_start) = lower[cursor..].find("<text") {
        let start = cursor + rel_start;
        let after_name = start + 5;
        let next_byte = lower.as_bytes().get(after_name).copied();
        if matches!(next_byte, Some(b'>') | Some(b' ') | Some(b'\t') | Some(b'\n') | Some(b'\r')) {
            if let Some(rel_open_end) = inner_xml[after_name..].find('>') {
                let open_end = after_name + rel_open_end;
                if let Some(rel_close) = lower[open_end + 1..].find("</text>") {
                    found_text_tag = true;
                    combined.push_str(&xml_unescape(&inner_xml[open_end + 1..open_end + 1 + rel_close]));
                    cursor = open_end + 1 + rel_close + 7;
                    continue;
                }
            }
        }
        cursor = after_name;
    }

    if found_text_tag {
        combined
    } else {
        xml_unescape(&strip_all_xml_tags(inner_xml))
    }
}

fn map_fdx_type_to_element(raw_type: &str) -> ElementType {
    match raw_type.trim().to_ascii_lowercase().as_str() {
        "scene heading" => ElementType::SceneHeading,
        "action" => ElementType::Action,
        "character" => ElementType::Character,
        "parenthetical" => ElementType::Parenthetical,
        "dialogue" => ElementType::Dialogue,
        "transition" => ElementType::Transition,
        "shot" => ElementType::Shot,
        "lyric" | "song lyric" => ElementType::SongLyric,
        "new act" | "act" | "end of act" => ElementType::SectionAct,
        "general" | "note" => ElementType::Note,
        _ => ElementType::Action,
    }
}

fn parse_revision_color(raw: &str) -> Option<RevisionColor> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "white" => Some(RevisionColor::White),
        "blue" => Some(RevisionColor::Blue),
        "pink" => Some(RevisionColor::Pink),
        "yellow" => Some(RevisionColor::Yellow),
        "green" => Some(RevisionColor::Green),
        "goldenrod" => Some(RevisionColor::Goldenrod),
        "buff" => Some(RevisionColor::Buff),
        "salmon" => Some(RevisionColor::Salmon),
        "cherry" => Some(RevisionColor::Cherry),
        _ => None,
    }
}

fn iter_paragraphs<F: FnMut(&str, &str)>(xml: &str, mut f: F) {
    let lower = xml.to_ascii_lowercase();
    let mut cursor = 0;
    while let Some(rel_start) = lower[cursor..].find("<paragraph") {
        let start = cursor + rel_start;
        let after_name = start + 10;
        let next_byte = lower.as_bytes().get(after_name).copied();
        if matches!(next_byte, Some(b'>') | Some(b' ') | Some(b'\t') | Some(b'\n') | Some(b'\r')) {
            if let Some(rel_open_end) = xml[after_name..].find('>') {
                let open_end = after_name + rel_open_end;
                let attrs = &xml[after_name..open_end];
                if let Some(rel_close) = lower[open_end + 1..].find("</paragraph>") {
                    let close_start = open_end + 1 + rel_close;
                    let inner = &xml[open_end + 1..close_start];
                    f(attrs, inner);
                    cursor = close_start + 12;
                    continue;
                }
            }
        }
        cursor = after_name;
    }
}

/// Extracts Title and Author metadata from an FDX `<TitlePage>` section.
pub fn extract_fdx_title_page(xml: &str) -> FdxTitlePageMeta {
    let Some(title_page_xml) = find_tag_inner(xml, "TitlePage") else {
        return FdxTitlePageMeta::default();
    };

    let mut meta = FdxTitlePageMeta::default();
    iter_paragraphs(title_page_xml, |attrs, inner| {
        let p_type = extract_xml_attr(attrs, "Type")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        let text = extract_paragraph_text(inner).trim().to_string();
        if text.is_empty() {
            return;
        }
        if p_type == "title" && meta.title.is_none() {
            meta.title = Some(text);
        } else if (p_type == "author" || p_type == "authors") && meta.written_by.is_none() {
            meta.written_by = Some(text);
        }
    });
    meta
}

/// Parses Final Draft (.fdx) XML into structured `ScriptBlock`s, preserving scene numbers,
/// dual dialogue markers, revision colors, and UTF-8 Indic text.
pub fn parse_fdx_xml(xml: &str, active_revision: RevisionColor) -> Vec<ScriptBlock> {
    let without_title = strip_tag_blocks(xml, "TitlePage");
    let body_xml = find_tag_inner(&without_title, "Content").unwrap_or(&without_title);

    // Annotate <DualDialogue>...</DualDialogue> paragraphs by tracking byte ranges
    let lower_body = body_xml.to_ascii_lowercase();
    let mut dual_ranges: Vec<(usize, usize)> = Vec::new();
    let mut search_from = 0;
    while let Some(rel_start) = lower_body[search_from..].find("<dualdialogue") {
        let start = search_from + rel_start;
        let after_name = start + 13;
        if let Some(rel_open_end) = body_xml[after_name..].find('>') {
            let open_end = after_name + rel_open_end;
            if let Some(rel_close) = lower_body[open_end + 1..].find("</dualdialogue>") {
                let close_start = open_end + 1 + rel_close;
                dual_ranges.push((open_end + 1, close_start));
                search_from = close_start + 15;
                continue;
            }
        }
        search_from = after_name;
    }

    let mut blocks = Vec::new();
    let mut scene_count = 1usize;
    let mut idx = 0usize;

    let mut cursor = 0usize;
    while let Some(rel_start) = lower_body[cursor..].find("<paragraph") {
        let start = cursor + rel_start;
        let after_name = start + 10;
        let next_byte = lower_body.as_bytes().get(after_name).copied();
        if matches!(next_byte, Some(b'>') | Some(b' ') | Some(b'\t') | Some(b'\n') | Some(b'\r')) {
            if let Some(rel_open_end) = body_xml[after_name..].find('>') {
                let open_end = after_name + rel_open_end;
                let attrs = &body_xml[after_name..open_end];
                if let Some(rel_close) = lower_body[open_end + 1..].find("</paragraph>") {
                    let close_start = open_end + 1 + rel_close;
                    let inner = &body_xml[open_end + 1..close_start];
                    cursor = close_start + 12;

                    let raw_type = extract_xml_attr(attrs, "Type").unwrap_or_else(|| "Action".to_string());
                    let text = extract_paragraph_text(inner).replace("\r\n", "\n");
                    if text.trim().is_empty() {
                        continue;
                    }

                    let element_type = map_fdx_type_to_element(&raw_type);
                    let num_attr = extract_xml_attr(attrs, "Number");
                    let dual_attr = extract_xml_attr(attrs, "DualDialogue");
                    let in_dual_wrapper = dual_ranges.iter().any(|&(ds, de)| start >= ds && start < de);
                    let is_dual_dialogue = in_dual_wrapper
                        || matches!(
                            dual_attr.as_deref().map(|s| s.trim().to_ascii_lowercase()).as_deref(),
                            Some("yes") | Some("true")
                        );
                    let revision_color = extract_xml_attr(attrs, "RevisionID")
                        .and_then(|r| parse_revision_color(&r))
                        .unwrap_or(active_revision);

                    let scene_number = if element_type == ElementType::SceneHeading {
                        let trimmed_num = num_attr.as_deref().map(str::trim).filter(|s| !s.is_empty());
                        if let Some(n) = trimmed_num {
                            Some(n.to_string())
                        } else {
                            let s = scene_count.to_string();
                            scene_count += 1;
                            Some(s)
                        }
                    } else {
                        None
                    };

                    let act_marker = if element_type == ElementType::SectionAct {
                        Some(text.trim().to_string())
                    } else {
                        None
                    };

                    idx += 1;
                    blocks.push(ScriptBlock {
                        id: format!("fdx-{idx}"),
                        element_type,
                        text,
                        scene_number,
                        locked: false,
                        omitted: false,
                        revision_color,
                        is_dual_dialogue,
                        synopsis: None,
                        rasa: None,
                        act_marker,
                        production_tags: None,
                    });
                    continue;
                }
            }
        }
        cursor = after_name;
    }

    blocks
}

/// Formats script blocks into WhatsApp/Email-friendly plain text with bold/italic markers.
pub fn format_whatsapp_readable_text(blocks: &[ScriptBlock]) -> String {
    let mut out = Vec::new();
    for b in blocks {
        if b.omitted {
            continue;
        }
        match b.element_type {
            ElementType::SectionAct => {
                out.push(format!("\n━━━ {} ━━━\n", b.text.to_uppercase()));
            }
            ElementType::SceneHeading => {
                let num = b
                    .scene_number
                    .as_deref()
                    .filter(|s| !s.is_empty())
                    .map(|s| format!("{s}. "))
                    .unwrap_or_default();
                out.push(format!("\n*{}{}*", num, b.text.to_uppercase()));
            }
            ElementType::Character => {
                out.push(format!("\n      *{}*", b.text.to_uppercase()));
            }
            ElementType::Parenthetical => {
                out.push(format!("      _{}_", b.text));
            }
            ElementType::Dialogue => {
                out.push(format!("   {}", b.text));
            }
            ElementType::SongLyric => {
                out.push(format!("\n   ♪ _{}_ ♪", b.text));
            }
            ElementType::Transition => {
                out.push(format!("\n                        *{}*", b.text.to_uppercase()));
            }
            _ => {
                out.push(format!("\n{}", b.text));
            }
        }
    }
    out.join("\n").trim().to_string()
}

/// Formats script blocks into styled Courier HTML for rich clipboard copy.
pub fn format_styled_html_clipboard(blocks: &[ScriptBlock]) -> String {
    let rows: Vec<String> = blocks
        .iter()
        .filter(|b| !b.omitted)
        .map(|b| match b.element_type {
            ElementType::SceneHeading => {
                let num = b
                    .scene_number
                    .as_deref()
                    .filter(|s| !s.is_empty())
                    .map(|s| format!("{s}. "))
                    .unwrap_or_default();
                format!(
                    "<p style=\"font-family:'Courier New',monospace;font-weight:bold;text-transform:uppercase;margin-top:16px;\">{}{}</p>",
                    num, b.text
                )
            }
            ElementType::Character => format!(
                "<p style=\"font-family:'Courier New',monospace;text-transform:uppercase;margin-left:2.2in;margin-top:12px;margin-bottom:0;\">{}</p>",
                b.text
            ),
            ElementType::Parenthetical => format!(
                "<p style=\"font-family:'Courier New',monospace;margin-left:1.6in;margin-top:0;margin-bottom:0;\">{}</p>",
                b.text
            ),
            ElementType::Dialogue => format!(
                "<p style=\"font-family:'Courier New',monospace;margin-left:1.0in;margin-right:1.5in;margin-top:0;\">{}</p>",
                b.text
            ),
            ElementType::Transition => format!(
                "<p style=\"font-family:'Courier New',monospace;text-align:right;text-transform:uppercase;margin-top:12px;\">{}</p>",
                b.text
            ),
            ElementType::SongLyric => format!(
                "<p style=\"font-family:'Courier New',monospace;font-style:italic;margin-left:1.2in;color:#b45309;\">♪ {}</p>",
                b.text
            ),
            _ => format!(
                "<p style=\"font-family:'Courier New',monospace;margin-top:8px;\">{}</p>",
                b.text
            ),
        })
        .collect();

    format!("<div style=\"max-width:6.5in;margin:0 auto;\">{}</div>", rows.join("\n"))
}
