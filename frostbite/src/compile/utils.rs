//! # compile::utils
//!
//! This module contains utility functions used throughout the Frostbite compiler,
//! including code preview (for debugging) and preprocessing logic for cleaning Office Script code.

/// Prints a peek of the source code, showing the first and last `n_lines / 2`.
/// Used for debugging transformations like splitting or stripping.
///
/// # Arguments
///
/// * `source` - A string slice representing the source code to inspect.
/// * `n_lines` - The total number of lines to show. If the code is shorter than this, the entire content is shown.

use::std::collections::{HashMap, HashSet};

pub fn peek_code(source: &str, n_lines: usize) {
    // Split source code into individual lines
    let fr_lines: Vec<&str> = source.lines().collect();
    let total = fr_lines.len();

    // If the source is shorter than the requested peek, print it all
    if total <= n_lines {
        println!("{}", fr_lines.join("\n"));
    } else {
        // Otherwise, print the first and last half
        let half = n_lines / 2;
        let head = fr_lines[..half].to_vec();
        let tail = fr_lines[total - half..].to_vec();

        println!("{}\n...\n{}", head.join("\n"), tail.join("\n"));
    }
}

/// Strips comments, excess whitespace, and deduplicates blank lines from the source code.
/// This is an essential preprocessing step before attempting to parse or transform the code.
///
/// Handles:
/// - `//` single-line comments
/// - `/* ... */` block comments
/// - Preserves string literals (even multiline)
///
/// # Arguments
///
/// * `code` - The raw source code to clean
///
/// # Returns
///
/// A cleaned version of the code as a single `String`, with all comments and redundant whitespace removed.
pub fn preprocess_code(code: &str) -> String {
    let mut result = String::new();
    let mut chars = code.chars().peekable();

    let mut in_string = false;
    let mut string_delim = '\0';
    let mut in_single_comment = false;
    let mut in_multi_comment = false;

    while let Some(c) = chars.next() {
        if !in_single_comment && !in_multi_comment {
            if in_string {
                // Handle string escaping
                result.push(c);
                if c == '\\' {
                    if let Some(next) = chars.next() {
                        result.push(next);
                    }
                    continue;
                }
                // Close string if end detected
                if c == string_delim {
                    in_string = false;
                }
                continue;
            }

            // Detect start of string
            if c == '"' || c == '\'' || c == '`' {
                in_string = true;
                string_delim = c;
                result.push(c);
                continue;
            }

            // Detect start of comment blocks
            if c == '/' {
                if let Some(&next) = chars.peek() {
                    if next == '/' {
                        in_single_comment = true;
                        chars.next(); // Consume the second '/'
                        continue;
                    } else if next == '*' {
                        in_multi_comment = true;
                        chars.next(); // Consume the '*'
                        continue;
                    }
                }
            }
        }

        // Newlines always terminate single-line comments
        if c == '\n' {
            in_single_comment = false;
            if !in_multi_comment {
                result.push('\n');
            }
            continue;
        }

        // Detect end of multi-line comment
        if in_multi_comment && c == '*' {
            if let Some(&next) = chars.peek() {
                if next == '/' {
                    in_multi_comment = false;
                    chars.next(); // Consume '/'
                }
            }
            continue;
        }

        // Normal character
        if !in_single_comment && !in_multi_comment {
            result.push(c);
        }
    }

    // Strip trailing spaces on each line
    let cleaned = result
        .lines()
        .map(|line| line.trim_end())
        .collect::<Vec<_>>()
        .join("\n");

    // Remove consecutive blank lines
    let mut final_out = String::new();
    let mut last_blank = false;
    for line in cleaned.lines() {
        if line.trim().is_empty() {
            if !last_blank {
                final_out.push('\n');
                last_blank = true;
            }
        } else {
            final_out.push_str(line);
            final_out.push('\n');
            last_blank = false;
        }
    }

    final_out
}


#[cfg(test)]
mod tests {
    use super::*;

    // ---------- Tests for peek_code ----------

    #[test]
    fn peek_shorter_than_requested() {
        let src = "line1\nline2\nline3";
        peek_code(src, 10); // Should print all 3 lines
    }

    #[test]
    fn peek_exact_lines() {
        let src = (1..=10).map(|i| format!("line{}", i)).collect::<Vec<_>>().join("\n");
        peek_code(&src, 10); // Should print all lines exactly
    }

    #[test]
    fn peek_longer_shows_ellipsis() {
        let src = (1..=100).map(|i| format!("line{}", i)).collect::<Vec<_>>().join("\n");
        peek_code(&src, 10); // Should print 5 head, "...", 5 tail
    }

    #[test]
    fn peek_on_empty_source() {
        let src = "";
        peek_code(src, 10); // Should print nothing, not panic
    }

    // ---------- Tests for preprocess_code ----------

    #[test]
    fn removes_single_line_comments() {
        let input = r#"
            let x = 5; // this is a comment
            let y = x + 2; // another one
        "#;
        let out = preprocess_code(input);
        assert!(out.contains("let x = 5;"));
        assert!(out.contains("let y = x + 2;"));
        assert!(!out.contains("//"));
    }

    #[test]
    fn removes_multiline_comments() {
        let input = r#"
            /* This is a
               multiline comment */
            let z = 42;
        "#;
        let out = preprocess_code(input);
        assert!(out.contains("let z = 42;"));
        assert!(!out.contains("multiline"));
    }

    #[test]
    fn preserves_strings_with_comment_like_text() {
        let input = r#"let comment = "// not really";"#;
        let out = preprocess_code(input);
        assert!(out.contains(r#"let comment = "// not really";"#));
    }
}