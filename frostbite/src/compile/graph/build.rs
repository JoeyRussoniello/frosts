use crate::compile::utils::{parse_assignment, is_known_dataframe_field};
use std::collections::{HashMap, HashSet};

/// Parses a single method body and extracts all other `this.method()` or `output.method()` calls.
/// This replicates `from_main` logic but restricts detection to `this.` and tracks chained calls
/// while excluding calls on known DataFrame fields like `values`, `dtypes`, etc.
pub fn from_method_body(method_body: &str) -> HashSet<String> {
    let mut called = HashSet::new();
    let mut tracked_objects = HashMap::new();

    // Step 1: Detect let/const x = this.method() → track x and method
    for line in method_body.lines() {
        if let Some((var, func)) = parse_assignment(line, "this") {
            called.insert(func.to_string());
            tracked_objects.insert(var.to_string(), HashSet::new());
        }
    }

    // Step 2: Buffer method chains on tracked objects
    let mut buffer: HashMap<String, String> = HashMap::new();
    let mut current_object: Option<String> = None;

    for line in method_body.lines() {
        let trimmed = line.trim();

        if current_object.is_none() {
            for object in tracked_objects.keys() {
                if trimmed == object || trimmed.starts_with(&format!("{}.", object)) {
                    current_object = Some(object.clone());
                    buffer.entry(object.clone()).or_insert_with(String::new);
                    break;
                }
            }
        }

        if let Some(obj) = &current_object {
            buffer.get_mut(obj).unwrap().push_str(trimmed);
            buffer.get_mut(obj).unwrap().push(' ');

            if trimmed.ends_with(';') {
                current_object = None;
            }
        }
    }

    // Step 3: Extract method calls from chained expressions
    for (obj, block) in buffer {
        let method_calls = block
            .match_indices('.')
            .filter_map(|(i, _)| {
                let rest = &block[i + 1..];
                let name = rest.split(['(', ' ', '\n', ')']).next().unwrap_or("");

                // Skip known property access
                if is_known_dataframe_field(name) {
                    return None;
                }

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

    // Step 4: Union all collected method calls
    for methods in tracked_objects.values() {
        for method in methods {
            called.insert(method.clone());
        }
    }

    called
}
