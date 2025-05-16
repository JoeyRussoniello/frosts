//! # compile::usage
//!
//! This module defines `FrUsageTracker`, which statically analyzes the `main` function
//! to determine which functions and methods from the `fr` namespace are actually used.
//!
//! It supports identifying top-level `fr.function()` calls as well as chained method
//! calls on objects like `let df = fr.read_csv(...)`.

use std::collections::{HashMap, HashSet};

/// Tracks which `fr` methods and `DataFrame` methods are used in the `main` function.
/// This struct is used to filter which functions should be retained during compilation.
#[derive(Debug)]
pub struct FrUsageTracker {
    /// Set of all `fr.someFunction()` or `df.someMethod()` calls
    pub fr_calls: HashSet<String>,
    /// Mapping from local variables (like `df`) to method names called on them
    pub tracked_objects: HashMap<String, HashSet<String>>,
}

impl FrUsageTracker {
    /// Analyzes the main body of code to extract used `fr` methods and method chains.
    ///
    /// # Arguments
    ///
    /// * `main` - The string content of the main script body
    ///
    /// # Returns
    ///
    /// An instance of `FrUsageTracker` with populated `fr_calls` and `tracked_objects`
    pub fn from_main(main: &str) -> Self {
        let mut fr_calls = HashSet::new();
        let mut tracked_objects = HashMap::new();

        // Step 1: Detect direct fr.function() assignments
        for line in main.lines() {
            if let Some((var, func)) = Self::parse_fr_assignment(line) {
                fr_calls.insert(func.to_string());
                tracked_objects.insert(var.to_string(), HashSet::new());
            }
        }

        // Step 2: Accumulate chained method calls on tracked objects
        let mut buffer: HashMap<String, String> = HashMap::new();
        let mut current_object: Option<String> = None;

        for line in main.lines() {
            let trimmed = line.trim();

            // If this line starts a chain, begin buffering
            if current_object.is_none() {
                for object in tracked_objects.keys() {
                    if trimmed == object || trimmed.starts_with(&format!("{}.", object)) {
                        current_object = Some(object.clone());
                        buffer.entry(object.clone()).or_insert_with(String::new);
                        break;
                    }
                }
            }

            // Add to buffer until chain ends
            if let Some(obj) = &current_object {
                buffer.get_mut(obj).unwrap().push_str(trimmed);
                buffer.get_mut(obj).unwrap().push(' ');

                if trimmed.ends_with(';') {
                    current_object = None;
                }
            }
        }

        // Step 3: Extract all chained methods from each buffer
        for (obj, block) in buffer {
            let method_calls = block
                .match_indices('.') // look for .methodName(…
                .filter_map(|(i, _)| {
                    let rest = &block[i + 1..];
                    let name = rest.split(['(', ' ', '\n', ')']).next().unwrap_or("");
                    if name.chars().all(|c| c.is_alphanumeric() || c == '_') {
                        Some(name.to_string())
                    } else {
                        None
                    }
                })
                .collect::<HashSet<_>>();

            if let Some(entry) = tracked_objects.get_mut(&obj) {
                for m in &method_calls {
                    entry.insert(m.to_string());
                }
            }
        }

        // Step 4: Merge all tracked methods into the main `fr_calls` set
        for methods in tracked_objects.values() {
            for method in methods {
                fr_calls.insert(method.clone());
            }
        }

        Self {
            fr_calls,
            tracked_objects,
        }
    }

    /// Tries to parse a line of code like:
    /// `let df = fr.read_csv(...)` → returns `("df", "read_csv")`
    fn parse_fr_assignment(line: &str) -> Option<(&str, &str)> {
        let line = line.trim();
        if !line.starts_with("let ") {
            return None;
        }

        let parts: Vec<&str> = line.split('=').collect();
        if parts.len() != 2 {
            return None;
        }

        let lhs = parts[0].trim();
        let rhs = parts[1].trim();

        let var = lhs.strip_prefix("let")?.trim().split_whitespace().next()?;

        if rhs.starts_with("fr.") {
            let func = rhs.strip_prefix("fr.")?
                .split('(')
                .next()?;
            return Some((var, func));
        }

        None
    }

    /// Prints the collected usage summary to stdout.
    /// Useful for debugging what will be retained in the compiled output.
    pub fn print(&self) {
        println!("\n[Used fr methods]");
        for func in &self.fr_calls {
            println!("fr.{}", func);
        }

        println!("\n[Tracked objects]");
        for (obj, methods) in &self.tracked_objects {
            println!("{}: {:?}", obj, methods);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- Tests for parse_fr_assignment ---

    #[test]
    fn parses_valid_fr_assignment() {
        let line = "let df = fr.read_csv(csv);";
        let result = FrUsageTracker::parse_fr_assignment(line);
        assert_eq!(result, Some(("df", "read_csv")));
    }

    #[test]
    fn ignores_non_fr_assignment() {
        let line = "let x = workbook.getSheet();";
        let result = FrUsageTracker::parse_fr_assignment(line);
        assert_eq!(result, None);
    }

    #[test]
    fn handles_spacing_and_tabs() {
        let line = "   let    data =    fr.load();";
        let result = FrUsageTracker::parse_fr_assignment(line);
        assert_eq!(result, Some(("data", "load")));
    }

    #[test]
    fn ignores_invalid_assignment_format() {
        let line = "df = fr.read_csv(csv);"; // no `let`
        let result = FrUsageTracker::parse_fr_assignment(line);
        assert_eq!(result, None);
    }

    // --- Tests for from_main usage extraction ---

    #[test]
    fn tracks_direct_fr_call() {
        let main = r#"
            let df = fr.read_sheet(ws);
        "#;
        let tracker = FrUsageTracker::from_main(main);
        assert!(tracker.fr_calls.contains("read_sheet"));
        assert!(tracker.tracked_objects.contains_key("df"));
    }

    #[test]
    fn detects_chained_method_calls() {
        let main = r#"
            let df = fr.read_csv(data);
            df.filter("col", v => v > 10).to_json();
        "#;
        let tracker = FrUsageTracker::from_main(main);
        assert!(tracker.fr_calls.contains("read_csv"));
        assert!(tracker.fr_calls.contains("filter"));
        assert!(tracker.fr_calls.contains("to_json"));
        assert_eq!(tracker.tracked_objects.get("df").unwrap().len(), 2);
    }

    #[test]
    fn handles_multiline_method_chains() {
        let main = r#"
            let df = fr.read_csv(data);
            df
                .groupBy(["Dept"])
                .rename({ Dept: "Department" })
                .to_csv();
        "#;
        let tracker = FrUsageTracker::from_main(main);
        for method in ["groupBy", "rename", "to_csv"] {
            assert!(tracker.fr_calls.contains(method));
        }
    }

    #[test]
    fn ignores_non_tracked_object_calls() {
        let main = r#"
            let x = workbook.getSheet();
            x.getRange().getValues();
        "#;
        let tracker = FrUsageTracker::from_main(main);
        assert!(tracker.fr_calls.is_empty());
    }
}
