use crate::models::{ElementType, RevisionColor, ScriptBlock};

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
