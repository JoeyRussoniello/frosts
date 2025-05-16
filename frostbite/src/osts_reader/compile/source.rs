struct FrostSource {
    fr: String,
    main: String,
}

impl FrostSource {
    fn peek(&self, step_name: &str) {
        println!("{}:step_name", step_name);
        println!("==== FR NAMESPACE ====");
        peek_code(&self.fr, 20);
        println!("==== MAIN SCRIPT ====");
        peek_code(&self.main, 20);
    }

    fn from_body(body: &str) -> Self {
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

        FrostSource {
            fr: fr_namespace,
            main: main_script,
        }
    }

    fn preprocess(&mut self, clean_main: bool) {
        self.fr = preprocess_code(&self.fr);
        if clean_main {
            self.main = preprocess_code(&self.main);
        }
    }

    fn extract_function_set(&self) -> FrostFunctionSet {
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
            } else if trimmed.starts_with("export class DataFrame") {
                current_name = "DataFrame".to_string();
                exports.insert("DataFrame".to_string(), format!("{}\n", line));
                in_dataframe = true;
                brace_depth = 0;
                continue;
            }

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

                // Never break out of df block
                continue;
            } else if !capturing && (trimmed.starts_with("function ") || trimmed.contains(" = function(")) {
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

struct FrostFunctionSet {
    functions: HashMap<String, String>,
    dataframe_methods: HashMap<String, String>,
    exports: HashMap<String, String>,
}

