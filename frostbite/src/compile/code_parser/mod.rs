use std::collections::HashSet;

pub struct FunctionParser {
    pub tracking: HashSet<String>,
    pub functions: HashSet<String>,
}

impl FunctionParser {
    pub fn new() -> Self {
        FunctionParser {
            tracking: HashSet::new(),
            functions: HashSet::new(),
        }
    }

    fn first_pass_assignments(&mut self, code: &str, initial_substr: &str) {
        self.tracking.insert(initial_substr.to_string());

        for line in code.lines(){
            let assignments: Vec<&str> = self.tracking
                .iter()
                .filter_map(|substr| parse_assignment(line, &substr))
                .collect();

            assignments.iter().for_each(|a| {self.tracking.insert(a.to_string());});
        }
    }

    fn second_pass_methods(&mut self, code: &str) {
        let statements = code.split(';');

        for stmt in statements {
            let stmt = stmt.trim();
            if stmt.is_empty() {
                continue;
            }

            if let Some((base_var, methods)) = self.find_methods_in_chain(stmt) {
                self.functions.extend(methods.iter().cloned());
                self.tracking.insert(base_var.to_string());
            }
        }
    }

    fn clean_methods(&mut self){
        //Initialize a new empty HashSet
        let mut new_hash:HashSet<String> = HashSet::new();

        //Trim the hashset so that it doesn't start with "="
        self.functions
            .iter()
            .filter(|func| !func.trim().starts_with("="))
            .for_each(|f| {
                new_hash.insert(f.to_string());
            });
        self.functions = new_hash;
    }

    fn find_methods_in_chain(&self, code: &str) -> Option<(String, Vec<String>)> {
        let mut longest_match = "";

        for tracked in &self.tracking {
            if code.contains(tracked) && tracked.len() > longest_match.len() {
                longest_match = tracked;
            }
        }

        if longest_match.is_empty() {
            return None;
        }

        let start = code.find(longest_match)? + longest_match.len();
        let after = &code[start..];

        let mut methods = Vec::new();
        let mut paren_depth = 0;

        for segment in after.split('.') {
            let trimmed = segment.trim();
            if trimmed.is_empty() {
                continue;
            }

            let base = trimmed
                .split('(')
                .next()
                .unwrap_or("")
                .trim_end_matches(';')
                .trim();

            //Skip on DataFrame attributes to avoid map            
            if !base.is_empty() && is_known_dataframe_field(base){
                break
            }
            else if !base.is_empty(){
                methods.push(base.to_string());
            }
            else{
                paren_depth += trimmed.matches('(').count();
                paren_depth -= trimmed.matches(')').count();

                if paren_depth <= 0 && trimmed.ends_with(';') {
                    break;
                }
            }
        }

        Some((longest_match.to_string(), methods))
    }

    pub fn parse(&mut self, code: &str, initial_substr: &str){
        self.first_pass_assignments(code, initial_substr);
        self.second_pass_methods(code);
        self.clean_methods();
    }

    pub fn get_methods(&self) -> Vec<String>{
        return self.functions.iter().map(|s| s.into()).collect();
    }
}

fn parse_assignment<'a>(line: &'a str, substr: &str) -> Option<&'a str> {
    let line= line.trim();
    if !(line.starts_with("let ") || line.starts_with("const ")) {
        return None;
    }

    let parts: Vec<&str> = line.split('=').collect();
    if parts.len() != 2 {
        return None;
    }

    let lhs = parts[0].trim();
    let rhs = parts[1].trim();

    if rhs.starts_with(substr){
        let var = lhs
            .strip_prefix("let")
            .or_else(|| lhs.strip_prefix("const"))?
            .trim()
            .split_whitespace()
            .next();
        
        return var;
    }

    None
}

/// Returns true if the method reference is actually a known DataFrame field,
/// such as `this.values`, `this.columns`, etc.
pub fn is_known_dataframe_field(s: &str) -> bool {
    ["values", "columns", "dtypes", "__headers"]
        .iter()
        .any(|field| s.contains(field))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_assignment() {
        let line = "let df = fr.read_sheet();";
        assert_eq!(parse_assignment(line,"fr"), Some("df"));
    }

    #[test]
    fn test_multiline_chain() {
        let code = r#"
            let df = fr.read_sheet();
            let result = df
                .filter()
                .groupBy()
                .set_column("x", df.apply());
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "df");

        assert!(parser.functions.contains("filter"));
        assert!(parser.functions.contains("groupBy"));
        assert!(parser.functions.contains("set_column"));
        assert!(parser.functions.contains("apply"));
    }

    #[test]
    fn parses_separate_statements() {
        let code = r#"
            let df = fr.read_sheet();
            df.print();
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("print"));
    }

    #[test]
    fn parser_shadows() {
        let code = r#"
            let df = fr.read_sheet()
            let df_renamed = df.rename();
            df_renamed.to_csv();
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code,"fr");

        assert!(parser.functions.contains("rename"));
        assert!(parser.functions.contains("to_csv"));
    }

    #[test]
    fn parses_single_line_chain(){
        let code = "let df = fr.read_sheet().filter()";
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_sheet"));
        assert!(parser.functions.contains("filter"));
    }

    #[test]
    fn parses_multiple_statements_same_line() {
        let code = "let df = fr.read_csv(); df.filter().groupBy(); df.print();";
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_csv"));
        assert!(parser.functions.contains("filter"));
        assert!(parser.functions.contains("groupBy"));
        assert!(parser.functions.contains("print"));
    }

    #[test]
    fn parses_irregular_whitespace() {
        let code = r#"
            let    df = fr.read_sheet( );
            df     .     filter (  )
                . groupBy ( );
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_sheet"));
        assert!(parser.functions.contains("filter"));
        assert!(parser.functions.contains("groupBy"));
    }

    #[test]
    fn parser_finds_nested_calls() {
        let code = r#"
            let df = fr.read_sheet();
            let x = df.set("col", df.apply());
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_sheet"));
        assert!(parser.functions.contains("set"));
        assert!(parser.functions.contains("apply"));
    }

    #[test]
    fn parser_supports_const_assignment() {
        let code = r#"
            const df = fr.read_sheet();
            df.print();
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_sheet"));
        assert!(parser.functions.contains("print"));
    }

    #[test]
    fn parser_ignores_unrelated_code() {
        let code = r#"
            function hello() { return 5; }
            const not_tracked = "df.fake().call()";
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert_eq!(parser.functions.is_empty(), true);
    }

    #[test]
    fn parser_finds_methods(){
        let code = r#"
            const now = fr.today;
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code,"fr");
        assert!(parser.functions.contains("today"))
    }

    #[test]
    fn parser_ignores_subcalls_of_df_methods(){
        let code = r#"
            this.values.map();
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "this");
        assert!(parser.functions.is_empty());
    }

    #[test]
    fn parses_single_line_chain_without_semicolon() {
        let code = r#"
            let df = fr.read_sheet()
            df.filter().groupBy()
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_sheet"));
        assert!(parser.functions.contains("filter"));
        assert!(parser.functions.contains("groupBy"));
    }

    #[test]
    fn parses_mixed_semicolon_usage() {
        let code = r#"
            let df = fr.read_sheet()
            df.filter();
            df.groupBy()
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_sheet"));
        assert!(parser.functions.contains("filter"));
        assert!(parser.functions.contains("groupBy"));
    }

    #[test]
    fn parses_multiline_chain_without_semicolon() {
        let code = r#"
            let df = fr.read_sheet()
            df
            .filter()
            .groupBy()
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_sheet"));
        assert!(parser.functions.contains("filter"));
        assert!(parser.functions.contains("groupBy"));
    }

    #[test]
    fn parses_multiline_arguments_in_chain() {
        let code = r#"
            df
                .groupBy(
                    ['City', 'Department'],
                    { "Salary": ['mean', 'count'] }
                )
                .rename({
                    "Salary_mean": "Average Salary",
                    "Salary_count": "Num Employees"
                })
        "#;

        let mut parser = FunctionParser::new();
        parser.tracking.insert("df".to_string());
        parser.second_pass_methods(code);

        assert!(parser.functions.contains("groupBy"));
        assert!(parser.functions.contains("rename"));
    }
}
