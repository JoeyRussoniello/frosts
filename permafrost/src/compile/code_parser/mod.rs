use std::collections::HashSet;

pub struct FunctionParser {
    pub tracking: HashSet<String>,
    pub functions: HashSet<String>,
}

impl FunctionParser {
    pub fn new() -> Self {
        let mut tracking_start :HashSet<String> = HashSet::new();
        tracking_start.insert(String::from("new DataFrame")); //Track new DataFrame by default for internal use 
        FunctionParser {
            tracking: tracking_start,
            functions: HashSet::new(),
        }
    }

    fn first_pass_assignments(&mut self, code: &str, initial_substr: &str) {
        self.tracking.insert(initial_substr.to_string());

        for line in code.lines(){
            let assignments: Vec<&str> = self.tracking
                .iter()
                .filter_map(|substr| parse_assignment(line, &substr))
                .flatten()
                .collect();

            for a in assignments {
                if !is_apply_assignment(line) {
                    self.tracking.insert(a.to_string());
                }
            }
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

        //Second pass for finding iterators
        for tracked in &self.tracking {
            let pattern = format!("of {}.", tracked);
            if let Some(pos) = code.find(&pattern) {
                let after = &code[pos + pattern.len()..];

                let method = after
                    .split(|c| c == '(' || c == ' ' || c == ')' || c == ';')
                    .next()
                    .unwrap_or("")
                    .trim();

                if !method.is_empty() && !is_known_dataframe_field(method) {
                    self.functions.insert(method.to_string());
                }
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
        //Messay and complicated substr matching
        let mut longest_match = "";

        for tracked in &self.tracking {
            for (pos, _) in code.match_indices(tracked) {

            let after = code[pos + tracked.len()..].trim_start();
            let is_boundary_valid = after.starts_with('.') || after.starts_with('[');

            if is_token_match(code,pos,tracked) && is_boundary_valid && tracked.len() > longest_match.len() {
                longest_match = tracked;
            }
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

fn parse_assignment<'a>(line: &'a str, substr: &str) -> Option<Vec<&'a str>> {
    let line = line.trim();
    if !(line.starts_with("let ") || line.starts_with("const ")) {
        return None;
    }

    let parts: Vec<&str> = line.splitn(2, '=').collect();
    if parts.len() != 2 {
        return None;
    }

    let lhs = parts[0].trim();
    let rhs = parts[1].trim();

    if !rhs.contains(substr) {
        return None;
    }

    extract_lhs_variables(lhs)
}


/// Returns true if the method reference is actually a known DataFrame field,
/// such as `this.values`, `this.columns`, etc.
pub fn is_known_dataframe_field(s: &str) -> bool {
    ["values", "columns", "dtypes", "__headers"]
        .iter()
        .any(|field| s.contains(field))
}

fn is_apply_assignment(line: &str) -> bool {
    line.contains(".apply(")
}

/// Parses the left-hand side of an assignment and returns the declared variable names.
/// Supports both single variables and array destructuring like `[a, b]`.
fn extract_lhs_variables(lhs: &str) -> Option<Vec<&str>> {
    let lhs_vars = lhs
        .strip_prefix("let")
        .or_else(|| lhs.strip_prefix("const"))?
        .trim();

    if lhs_vars.starts_with('[') && lhs_vars.ends_with(']') {
        let cleaned = lhs_vars.trim_matches(&['[', ']'][..]);
        let vars: Vec<&str> = cleaned
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();
        Some(vars)
    } else {
        // Single variable fallback
        let var = lhs_vars.split_whitespace().next()?;
        Some(vec![var])
    }
}


fn is_token_match(code: &str, position: usize, tracked: &str) -> bool {
    let before = &code[..position];
    let after = &code[position + tracked.len()..];

    let left_char = before.chars().rev().find(|c| !c.is_whitespace());
    let right_char = after.chars().find(|c| !c.is_whitespace());

    let left_valid = match left_char {
        Some(c) => !c.is_alphanumeric() && c != '_',
        None => true,
    };

    let right_valid = match right_char {
        Some(c) => !c.is_alphanumeric() && c != '_',
        None => true,
    };

    left_valid && right_valid
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_assignment() {
        let line = "let df = fr.read_sheet();";
        assert_eq!(parse_assignment(line,"fr"), Some(vec!["df"]));
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

    #[test]
    fn parses_mixed_multiline_and_single_line_arguments() {
        let code = r#"
            df.groupBy(
                ["Team"],
                {"Sales": ["sum"]}
            ).print()
        "#;

        let mut parser = FunctionParser::new();
        parser.tracking.insert("df".to_string());
        parser.second_pass_methods(code);

        assert!(parser.functions.contains("groupBy"));
        assert!(parser.functions.contains("print"));
    }
    #[test]
    fn parses_semicolon_inside_arguments() {
        let code = r#"
            df.set_col("x; y", df.apply())
            df.save()
        "#;

        let mut parser = FunctionParser::new();
        parser.tracking.insert("df".to_string());
        parser.second_pass_methods(code);

        assert!(parser.functions.contains("set_col"));
        assert!(parser.functions.contains("apply"));
        assert!(parser.functions.contains("save"));
    }

    #[test]
    fn parser_avoids_partial_identifier_matches() {
        let code = r#"
            let frequency = workbook.getWorksheet("3")
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr"); // "fr" shouldn't match anything

        assert!(parser.functions.is_empty());
    }

    #[test]
    fn parser_ignores_dot_number_literals() {
        let code = r#"
            let df = fr.read_sheet();
            let income_tax = df.apply(row => row.get_number("Income") * 0.3);
            df.apply(row => row.get_number("Salary") * 0.3);
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_sheet"));
        assert!(parser.functions.contains("apply"));
        assert!(parser.functions.contains("get_number"));
        assert!(!parser.functions.contains("3")); // This is what we’re fixing!
    }

    #[test]
    fn parser_does_not_track_apply_result_as_dataframe() {
        let code = r#"
            let df = fr.read_csv();
            let x = df.apply(row => row.get("Income"));
            x.map(v => v.toString());
        "#;

        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.functions.contains("read_csv"));
        assert!(parser.functions.contains("apply"));

        // Should NOT track x as a DataFrame
        assert!(!parser.functions.contains("map"));
    }

    #[test]
    fn parses_df_from_new_dataframe() {
        let code = r#"
            let df = new DataFrame(...);
            df.filter();
        "#;

        let mut parser = FunctionParser::new();
        parser.parse(code, "this"); // we still use "this" as a fallback root

        assert!(parser.tracking.contains("df"));
        assert!(parser.functions.contains("filter"));
    }

    #[test]
    fn parses_groupby_call() {
        let code = "const groupDf = new DataFrame([this.columns, ...grouped[groupKey].map(row => this.columns.map(col => row[col]))]);";

        let mut parser = FunctionParser::new();
        parser.parse(code, "this");

        assert!(parser.tracking.contains("groupDf"));
    }

    #[test]
    fn parses_array_destructuring_assignment() {
        let line = r#"
            let [df1, df2] = json_inputs.map(s => fr.read_json(s));
            let filtered = df1.filter(row => row.get_number("Issues") > 2);
        "#;
        let mut parser = FunctionParser::new();
        parser.parse(line,"fr");
        assert!(parser.tracking.contains("df1"));
        assert!(parser.tracking.contains("df2"));
        assert!(parser.tracking.contains("filtered"));
        assert!(parser.functions.contains("filter"))
    }

    #[test]
    fn df_does_not_match_df_filtered() {
        let code = r#"
            let df = fr.read_csv();
            let df_filtered = df.filter();
        "#;

        let mut parser = FunctionParser::new();
        parser.parse(code, "fr");

        assert!(parser.tracking.contains("df"));
        assert!(parser.tracking.contains("df_filtered"));
        assert!(parser.functions.contains("read_csv"));
        assert!(parser.functions.contains("filter"));
    }

    #[test]
    fn parser_works_on_fr_iterators(){
        let code = r#"
        set_column(columnName: string, values: CellValue[], inplace: boolean = false): DataFrame {
            if (this.values.length != values.length) {
                throw new RangeError(`DataFrame and Input Dimensions Don't Match\nDataFrame has ${this.values.length} rows, while input values have ${values.length}`);
            }
            let dtype = detectColumn(values.map(row => row.toString()));
            let output = this.copy()

            if (!output.columns.includes(columnName)) {
                output.columns.push(columnName);
                output.__headers.add(columnName);
            }

            output.dtypes[columnName] = dtype;
            for (let [row, index] of output.iterrows()) {
                row[columnName] = values[index];
            }

            this.__assign_inplace(output, inplace);
            return output;
        };"#;

        let mut parser = FunctionParser::new();
        parser.parse(code, "this");
        
        assert!(parser.tracking.contains("output"));
        assert!(parser.functions.contains("copy"));
        assert!(parser.functions.contains("iterrows"));
        assert!(parser.functions.contains("__assign_inplace"));
    }

}
