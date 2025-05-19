//! # compile
//!
//! This is the top-level module for all compilation logic used in the `frostbite` CLI.
//!
//! It includes parsing, usage tracking, preprocessing, and namespace/function extraction
//! for reducing `.osts` scripts into optimized, minimal subsets.

/// Handles parsing and preprocessing of the input `.osts` file into structured segments.
pub mod source;

// Maps nested function call loops in a graph for compilation
pub mod graph;

/// Provides shared utilities like `peek_code()` and `preprocess_code()`.
pub mod utils;

pub mod code_parser;

/// Main compilation function
use source::FrostSource;
use code_parser::FunctionParser;

pub fn compile_from_string(input: &str) -> Result<String, String> {
    let mut source = FrostSource::from_body(input);

    // Preprocess source and remove comments
    source.preprocess(true);

    // Extract all fr methods
    let fr_namespace = source.extract_function_set();

    // Build call graph
    let fr_call_graph = super::compile::graph::Graph::from_function_set(&fr_namespace);

    // Parse main body and track which fr methods are used
    let mut parser = FunctionParser::new();
    parser.parse(&source.main, "fr");

    let mut called_functions = parser.get_methods();
    called_functions.sort();

    // BFS to resolve all dependent methods
    let mut required_methods = fr_call_graph.search(&called_functions);
    required_methods.insert("constructor".to_string());

    // Compile fr namespace down to only used methods
    let compiled_fr_code = fr_namespace.compile(&required_methods);

    // Reattach the cleaned main code
    let compiled_code = compiled_fr_code + "\n" + &source.main;

    Ok(compiled_code)
}
