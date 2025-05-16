// src/main.rs

mod osts_reader;

use std::collections::{HashMap, HashSet};
use std::env;
use osts_reader::{Osts, read_file};

struct FrostSource {
    fr: String,
    main: String,
}

struct FrostFunctionSet {
    functions: HashMap<String, String>,
    dataframe_methods: HashMap<String, String>,
    exports: HashSet<String>,
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
        let mut exports = HashSet::new();

        let mut current_fn = String::new();
        let mut current_name = String::new();
        let mut brace_depth :usize= 0;
        let mut capturing = false;
        let mut in_dataframe = false;

        for line in self.fr.lines() {
            let trimmed = line.trim();

            if trimmed.starts_with("export function ") {
                if let Some(name) = trimmed.strip_prefix("export function ") {
                    if let Some(name) = name.split('(').next() {
                        exports.insert(name.trim().to_string());
                    }
                }
            } else if trimmed.starts_with("export class DataFrame") {
                exports.insert("DataFrame".to_string());
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
                    brace_depth -= line.matches('}').count();

                    if brace_depth == 0 {
                        dataframe_methods.insert(current_name.clone(), current_fn.clone());
                        capturing = false;
                        current_fn = String::new();        // Reset buffer
                        current_name = String::new();      // Reset name
                    }
                }
        
                
                //Never break out of df
                // if brace_depth == 0 {
                //     in_dataframe = false;
                // }
            } else if !capturing && (trimmed.starts_with("function ") || trimmed.contains(" = function(")) {
                let name = if trimmed.starts_with("function ") {
                    trimmed.strip_prefix("function ")
                        .and_then(|s| s.split('(').next())
                        .unwrap_or("").trim()
                } else {
                    trimmed.split('=').next()
                        .map(|s| s.trim())
                        .unwrap_or("")
                        .split('.').last().unwrap_or("")
                };

                current_name = name.to_string();
                capturing = true;
                brace_depth = trimmed.matches('{').count() - trimmed.matches('}').count();
                current_fn = format!("{}\n", line);
                continue;
            }

            if capturing {
                current_fn.push_str(line);
                current_fn.push('\n');
                brace_depth += line.matches('{').count();
                //Floor at zero to avoid panics
                brace_depth = brace_depth.saturating_sub(line.matches('}').count());

                if brace_depth == 0 {
                    functions.insert(current_name.clone(), current_fn.clone());
                    capturing = false;
                }
            }
        }

        FrostFunctionSet { functions, dataframe_methods, exports }
    }

}

struct FrUsageTracker {
    pub fr_calls: HashSet<String>,
    pub tracked_objects: HashMap<String, HashSet<String>>,
}

impl FrUsageTracker {
    fn from_main(main: &str) -> Self {
        let mut fr_calls = HashSet::new();
        let mut tracked_objects = HashMap::new();

        for line in main.lines() {
            if let Some((var, func)) = Self::parse_fr_assignment(line) {
                fr_calls.insert(func.to_string());
                tracked_objects.insert(var.to_string(), HashSet::new());
            }
        }

        let mut buffer: HashMap<String, String> = HashMap::new();
        let mut current_object: Option<String> = None;

        for line in main.lines() {
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

        for (obj, block) in buffer {
            let method_calls = block
                .match_indices('.')
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

        for methods in tracked_objects.values() {
            for method in methods {
                fr_calls.insert(method.clone());
            }
        }

        FrUsageTracker {
            fr_calls,
            tracked_objects,
        }
    }

    fn parse_fr_assignment(line: &str) -> Option<(&str, &str)> {
        let line = line.trim();
        if !line.starts_with("let ") { return None; }

        let parts: Vec<&str> = line.split('=').collect();
        if parts.len() != 2 { return None; }

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

    fn print(&self) {
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

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        eprintln!("Usage: frostbite <filename.osts>");
        std::process::exit(1);
    }

    let filename = &args[1];
    let content = read_file(filename);
    let script = Osts::from_string(&content);

    let mut source = FrostSource::from_body(&script.body);
    source.peek("Split into main and fr");

    source.preprocess(false);
    source.peek("Removing Comments");

    let tracker = FrUsageTracker::from_main(&source.main);
    tracker.print();

    let frost_set = source.extract_function_set();
    println!("\n[Top-level functions: {}]", frost_set.functions.len());
    println!("{:?}",frost_set.functions.keys());
    
    println!("\n[Top-level export function: {}", frost_set.exports.len());
    println!("{:?}", frost_set.exports);

    println!("[DataFrame methods: {}]", frost_set.dataframe_methods.len());
    println!("{:?}", frost_set.dataframe_methods.keys());
}

fn peek_code(source: &str, n_lines: usize) {
    let fr_lines: Vec<&str> = source.lines().collect();
    let total = fr_lines.len();

    if total <= n_lines {
        println!("{}", fr_lines.join("\n"));
    } else {
        let half = n_lines / 2;
        let head = fr_lines[..half].to_vec();
        let tail = fr_lines[total - half..].to_vec();

        println!("{}\n...\n{}", head.join("\n"), tail.join("\n"));
    }
}

fn preprocess_code(code: &str) -> String {
    let mut result = String::new();
    let mut chars = code.chars().peekable();

    let mut in_string = false;
    let mut string_delim = '\0';
    let mut in_single_comment = false;
    let mut in_multi_comment = false;

    while let Some(c) = chars.next() {
        if !in_single_comment && !in_multi_comment {
            if in_string {
                result.push(c);
                if c == '\\' {
                    if let Some(next) = chars.next() {
                        result.push(next);
                    }
                    continue;
                }
                if c == string_delim {
                    in_string = false;
                }
                continue;
            }

            if c == '"' || c == '\'' || c == '`' {
                in_string = true;
                string_delim = c;
                result.push(c);
                continue;
            }

            if c == '/' {
                if let Some(&next) = chars.peek() {
                    if next == '/' {
                        in_single_comment = true;
                        chars.next();
                        continue;
                    } else if next == '*' {
                        in_multi_comment = true;
                        chars.next();
                        continue;
                    }
                }
            }
        }

        if c == '\n' {
            in_single_comment = false;
            if !in_multi_comment {
                result.push('\n');
            }
            continue;
        }

        if in_multi_comment && c == '*' {
            if let Some(&next) = chars.peek() {
                if next == '/' {
                    in_multi_comment = false;
                    chars.next();
                }
            }
            continue;
        }

        if !in_single_comment && !in_multi_comment {
            result.push(c);
        }
    }

    let cleaned = result
        .lines()
        .map(|line| line.trim_end())
        .collect::<Vec<_>>()
        .join("\n");

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
