//! # compile
//!
//! This is the top-level module for all compilation logic used in the `frostbite` CLI.
//!
//! It includes parsing, usage tracking, preprocessing, and namespace/function extraction
//! for reducing `.osts` scripts into optimized, minimal subsets.

/// Handles parsing and preprocessing of the input `.osts` file into structured segments.
pub mod source;

/// Tracks usage of `fr` functions and chained `DataFrame` methods from the main body.
pub mod usage;

// Maps nested function call loops in a graph for compilation
pub mod graph;

/// Provides shared utilities like `peek_code()` and `preprocess_code()`.
pub mod utils;

pub mod code_parser;

// Re-export core components for ergonomic access
pub use source::*;
pub use usage::*;
pub use graph::*;
pub use code_parser::*;