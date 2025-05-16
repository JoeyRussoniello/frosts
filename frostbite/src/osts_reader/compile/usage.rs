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
