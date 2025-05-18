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
