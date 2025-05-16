pub fn peek_code(source: &str, n_lines: usize) {
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
