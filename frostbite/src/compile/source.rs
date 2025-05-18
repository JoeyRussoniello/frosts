//! # compile::source
//!
//! This module defines the `FrostSource` struct, which represents a raw `.osts` input file
//! split into its `namespace fr` body and `main` body. It also handles preprocessing
//! and extraction of Frosts functions and methods from the `fr` namespace.

use std::collections::HashMap;
use crate::compile::utils::preprocess_code;

/// Represents the two sections of a .osts script:
/// - `fr`: the core library namespace
/// - `main`: the user-facing entry point function
#[derive(Debug)]
pub struct FrostSource {
    /// The contents of the `namespace fr { ... }` section
    pub fr: String,
    /// The remaining code (typically the `main()` function)
    pub main: String,
}

/// Stores categorized function data extracted from the `fr` namespace:
/// - top-level utility functions
/// - methods on `class DataFrame`
/// - functions/classes explicitly exported
#[derive(Debug)]
pub struct FrostFunctionSet {
    /// Top-level `fr.functionName` mappings
    pub functions: HashMap<String, String>,
    /// `DataFrame.prototype.method` implementations
    pub dataframe_methods: HashMap<String, String>,
    /// Explicit `export function` and `export class` definitions
    pub exports: HashMap<String, String>,
}

impl FrostSource {
    /// Splits a raw `body` string into the `fr` namespace and the `main` logic.
    ///
    /// # Arguments
    ///
    /// * `body` - The full contents of a .osts file
    pub fn from_body(body: &str) -> Self {
        let mut fr_namespace = String::new();
        let mut main_script = String::new();

        let mut inside_fr = false;
        let mut brace_count = 0;

        for line in body.lines() {
            if line.contains("namespace fr") {
                inside_fr = true;
            }

            if inside_fr {
                fr_namespace.push_str(line);
                fr_namespace.push('\n');

                brace_count += line.matches('{').count();
                brace_count -= line.matches('}').count();

                if brace_count == 0 {
                    inside_fr = false;
                }
            } else {
                main_script.push_str(line);
                main_script.push('\n');
            }
        }

        Self {
            fr: fr_namespace,
            main: main_script,
        }
    }

    /// Prints the first and last few lines of the `fr` and `main` segments
    /// for inspection during intermediate compilation steps.
    ///
    /// # Arguments
    ///
    /// * `step_name` - A label to identify the processing phase
    pub fn peek(&self, step_name: &str) {
        println!("{}:step_name", step_name);
        println!("==== FR NAMESPACE ====");
        crate::compile::utils::peek_code(&self.fr, 20);
        println!("==== MAIN SCRIPT ====");
        crate::compile::utils::peek_code(&self.main, 20);
    }

    /// Preprocesses both `fr` and `main` to strip comments and normalize whitespace.
    ///
    /// # Arguments
    ///
    /// * `clean_main` - If true, also cleans the main function body
    pub fn preprocess(&mut self, clean_main: bool) {
        self.fr = preprocess_code(&self.fr);
        if clean_main {
            self.main = preprocess_code(&self.main);
        }
    }

    /// Parses all functions and methods from the `fr` namespace into categorized buckets.
    ///
    /// # Returns
    ///
    /// A `FrostFunctionSet` containing:
    /// - top-level functions
    /// - DataFrame methods
    /// - explicitly exported symbols
    pub fn extract_function_set(&self) -> FrostFunctionSet {
        let mut functions = HashMap::new();
        let mut dataframe_methods = HashMap::new();
        let mut exports = HashMap::new();

        let mut current_fn = String::new();
        let mut current_name = String::new();
        let mut brace_depth: usize = 0;
        let mut capturing = false;
        let mut in_dataframe = false;

        for line in self.fr.lines() {
            let trimmed = line.trim();

            // Handle `export function <name>()`
            if trimmed.starts_with("export function ") {
                if let Some(name) = trimmed.strip_prefix("export function ") {
                    if let Some(name) = name.split('(').next() {
                        current_name = name.trim().to_string();
                        capturing = true;
                        brace_depth = trimmed.matches('{').count();
                        current_fn = format!("{}\n", line);
                        continue;
                    }
                }
            }

            // Start of `export class DataFrame`
            else if trimmed.starts_with("export class DataFrame") {
                current_name = "DataFrame".to_string();
                exports.insert("DataFrame".to_string(), format!("{}\n", line));
                in_dataframe = true;
                brace_depth = 0;
                continue;
            }

            // Handle method bodies inside `DataFrame`
            if in_dataframe {
                brace_depth += line.matches('{').count();
                brace_depth = brace_depth.saturating_sub(line.matches('}').count());

                if !capturing && trimmed.contains('(') && trimmed.ends_with('{') {
                    current_name = trimmed
                        .split('(')
                        .next()
                        .unwrap_or("")
                        .trim()
                        .to_string();
                    capturing = true;
                    brace_depth += 1;
                    current_fn = format!("{}\n", line);
                    continue;
                }

                if capturing {
                    current_fn.push_str(line);
                    current_fn.push('\n');
                    brace_depth += line.matches('{').count();
                    brace_depth = brace_depth.saturating_sub(line.matches('}').count());

                    if brace_depth == 0 {
                        dataframe_methods.insert(current_name.clone(), current_fn.clone());
                        capturing = false;
                        current_fn = String::new();
                        current_name = String::new();
                    }
                }

                continue; // stay in dataframe class until end of file
            }

            // Top-level non-exported functions
            else if !capturing && (trimmed.starts_with("function ") || trimmed.contains(" = function(")) {
                let name = if trimmed.starts_with("function ") {
                    trimmed.strip_prefix("function ")
                        .and_then(|s| s.split('(').next())
                        .unwrap_or("")
                        .trim()
                } else {
                    trimmed
                        .split('=')
                        .next()
                        .map(|s| s.trim())
                        .unwrap_or("")
                        .split('.')
                        .last()
                        .unwrap_or("")
                };

                current_name = name.to_string();
                capturing = true;
                brace_depth = trimmed.matches('{').count().saturating_sub(trimmed.matches('}').count());
                current_fn = format!("{}\n", line);
                continue;
            }

            // Continue collecting function body
            if capturing {
                current_fn.push_str(line);
                current_fn.push('\n');
                brace_depth += line.matches('{').count();
                brace_depth = brace_depth.saturating_sub(line.matches('}').count());

                if brace_depth == 0 {
                    functions.insert(current_name.clone(), current_fn.clone());

                    if current_fn.starts_with("export function") {
                        exports.insert(current_name.clone(), current_fn.clone());
                    }

                    capturing = false;
                    current_fn = String::new();
                    current_name = String::new();
                }
            }
        }
        
        
        FrostFunctionSet {
            functions,
            dataframe_methods,
            exports,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- Tests for FrostSource::from_body ---

    #[test]
    fn splits_namespace_and_main_correctly() {
        let code = r#"
            namespace fr {
                function a() { return 1; }
            }

            function main() {
                console.log("hi");
            }
        "#;

        let source = FrostSource::from_body(code);
        assert!(source.fr.contains("function a()"));
        assert!(source.main.contains("function main()"));
    }

    #[test]
    fn handles_missing_namespace_gracefully() {
        let code = r#"
            function main() {
                console.log("nothing here");
            }
        "#;
        let source = FrostSource::from_body(code);
        assert!(source.fr.is_empty());
        assert!(source.main.contains("function main"));
    }

    #[test]
    fn handles_empty_input() {
        let source = FrostSource::from_body("");
        assert!(source.fr.is_empty());
        assert!(source.main.is_empty());
    }

    #[test]
    fn tracks_nested_braces_correctly() {
        let code = r#"
            namespace fr {
                function a() {
                    if (true) {
                        return 1;
                    }
                }
            }
            function main() {}
        "#;

        let source = FrostSource::from_body(code);
        assert!(source.fr.contains("function a"));
        assert!(source.main.contains("function main"));
    }

    // --- Tests for FrostSource::extract_function_set ---

    #[test]
    fn detects_dataframe_methods_and_exports() {
        let code = r#"
            namespace fr {
                export class DataFrame {
                    filter() {
                        return this;
                    }

                    rename() {
                        return this;
                    }
                }
            }

            function main() {}
        "#;

        let source = FrostSource::from_body(code);
        let parsed = source.extract_function_set();

        assert!(parsed.exports.contains_key("DataFrame"));
        assert!(parsed.dataframe_methods.contains_key("filter"));
        assert!(parsed.dataframe_methods.contains_key("rename"));
    }

    #[test]
    fn captures_top_level_function_but_not_exported() {
        let code = r#"
            namespace fr {
                function add(a, b) {
                    return a + b;
                }
            }
        "#;

        let source = FrostSource::from_body(code);
        let parsed = source.extract_function_set();

        assert!(parsed.functions.contains_key("add"));
        assert!(!parsed.exports.contains_key("add"));
    }

    #[test]
    fn captures_export_functions() {
        let code = r#"
            namespace fr {
                export function multiply(a, b) {
                    return a * b;
                }
            }
        "#;

        let source = FrostSource::from_body(code);
        let parsed = source.extract_function_set();

        assert!(parsed.functions.contains_key("multiply"));
    }

    #[test]
    fn handles_method_brace_depth_properly() {
        let code = r#"
            namespace fr {
                export class DataFrame {
                    nested() {
                        if (true) {
                            return this;
                        }
                    }
                }
            }
        "#;

        let source = FrostSource::from_body(code);
        let parsed = source.extract_function_set();

        assert_eq!(parsed.dataframe_methods.len(), 1);
        assert!(parsed.dataframe_methods.contains_key("nested"));
    }
}
