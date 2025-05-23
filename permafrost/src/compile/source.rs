//! # compile::source
//!
//! This module defines the `FrostSource` struct, which represents a raw `.osts` input file
//! split into its `namespace fr` body and `main` body. It also handles preprocessing
//! and extraction of Frosts functions and methods from the `fr` namespace.

use std::collections::{HashMap,HashSet};
use crate::compile::utils::preprocess_code;
use super::utils::clean_node;
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
/// - top-level utility functions held in always_take
/// - methods on `class DataFrame`
#[derive(Debug)]
pub struct FrostFunctionSet {
    /// Top-level `fr.functionName` mappings
    pub always_take: String,
    pub dataframe_methods: HashMap<String, String>,
    pub problematic_methods: HashMap<String, String>
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
    #[allow(dead_code)]
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
        let mut dataframe_methods = HashMap::new();
        let mut problematic_methods = HashMap::new();

        let mut current_fn = String::new();
        let mut current_name = String::new();
        let mut brace_depth: usize = 0;
        let mut capturing = false;

        let mut split_source = self.fr.split("constructor");
        let before_class = split_source.next().unwrap().to_string();
        let methods = "constructor".to_string() + split_source.next().unwrap();

        // 1️⃣ Handle problematic methods (before the class)
        for line in before_class.lines() {
            let trimmed = line.trim();

            if !capturing && trimmed.starts_with("export function") && trimmed.contains("combine_dfs(") {
                current_name = "combine_dfs".to_string();
                capturing = true;
                brace_depth = 1;
                current_fn = format!("{}\n", line);
                continue;
            }

            if capturing {
                current_fn.push_str(line);
                current_fn.push('\n');
                brace_depth += line.matches('{').count();
                brace_depth = brace_depth.saturating_sub(line.matches('}').count());

                if brace_depth == 0 {
                    problematic_methods.insert(current_name.clone(), current_fn.clone());
                    capturing = false;
                    current_fn.clear();
                    current_name.clear();
                }
            }
        }

        // 2️⃣ Handle DataFrame methods
        for line in methods.lines() {
            let trimmed = line.trim();

            if !capturing && trimmed.contains('(') && trimmed.ends_with('{') {
                current_name = trimmed
                    .split('(')
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                capturing = true;
                brace_depth = 1;
                current_fn = format!("{}\n", line);
                continue;
            }

            if capturing {
                current_fn.push_str(line);
                current_fn.push('\n');
                brace_depth += line.matches('{').count();
                brace_depth = brace_depth.saturating_sub(line.matches('}').count());

                if brace_depth == 0 {
                    let cleaned = clean_node(&current_name);
                    dataframe_methods.insert(cleaned, current_fn.clone());
                    capturing = false;
                    current_fn.clear();
                    current_name.clear();
                }
            }
        }

        FrostFunctionSet {
            always_take: before_class,
            dataframe_methods,
            problematic_methods,
        }
    }

}


impl FrostFunctionSet{
    pub fn compile(&self, necessary_functions: &HashSet<String>) -> String {
        let mut cleaned_header = self.always_take.clone();

        // Remove all problematic methods that are NOT used
        for (name, body) in &self.problematic_methods {
            if !necessary_functions.contains(name) {
                // naive removal: just slice out the function body
                cleaned_header = cleaned_header.replace(body, "");
            }
        }

        // Handle apply<T> workaround
        let method_str: String = necessary_functions
            .iter()
            .map(|func| {
                let call_method = if func == "apply" {
                    "apply<T>"
                } else {
                    func
                };

                self.dataframe_methods
                    .get(call_method)
                    .expect(&format!("Couldn't find method: {:?}, continuing with compilation...", func))
            })
            .cloned()
            .collect::<Vec<String>>()
            .join("\n");

        // Combine everything into a full script
        vec![
            cleaned_header,
            method_str,
            String::from("}"),
            String::from("}"),
        ]
        .join("\n")
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
    fn detects_dataframe_methods() {
        let code = r#"
            namespace fr {
                export class DataFrame {
                    constructor(){

                    }

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

        assert!(parsed.dataframe_methods.contains_key("filter"));
        assert!(parsed.dataframe_methods.contains_key("rename"));
        assert!(parsed.dataframe_methods.contains_key("constructor"));
    }


    #[test]
    fn handles_method_brace_depth_properly() {
        let code = r#"
            namespace fr {
                export class DataFrame {
                    constructor(){
                        
                    }
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

        assert_eq!(parsed.dataframe_methods.len(), 2);
        assert!(parsed.dataframe_methods.contains_key("nested"));
        assert!(parsed.dataframe_methods.contains_key("constructor"));
    }

    #[test]
    fn extract_function_set_moves_combine_dfs_to_problematic() {
        let src = r#"
            export function combine_dfs(dfs: DataFrame[]): DataFrame {
                return dfs[0].concat_all("outer", ...dfs.slice(1));
            }

            class DataFrame {
                constructor(data) {
                    this.values = data;
                }

                filter() {
                    return this.values.filter(x => x !== null);
                }
            }
        "#;

        let fake_source = FrostSource { fr: src.to_string(), main:String::from("") };
        let frost_set = fake_source.extract_function_set();

        assert!(frost_set.problematic_methods.contains_key("combine_dfs"));
        assert!(frost_set.dataframe_methods.contains_key("filter"));
        assert!(!frost_set.dataframe_methods.contains_key("combine_dfs"));
    }

    #[test]
    fn compile_does_not_include_unnecessary_problematic_methods() {
        let frost_set = FrostFunctionSet {
            always_take: "export function combine_dfs(...) {\n    return 'test';\n}\nlet unused = 1;".to_string(),
            dataframe_methods: {
                let mut hm = HashMap::new();
                hm.insert("filter".to_string(), "filter() { return this; }".to_string());
                hm
            },
            problematic_methods: {
                let mut hm = HashMap::new();
                hm.insert("combine_dfs".to_string(), "export function combine_dfs(...) {\n    return 'test';\n}\n".to_string());
                hm
            },
        };

        let output = frost_set.compile(&["filter".to_string()].into_iter().collect());

        assert!(!output.contains("combine_dfs"));
        assert!(output.contains("filter()"));
    }
}
