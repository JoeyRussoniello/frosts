//! # frostbite main
//!
//! Entry point for the Frostbite CLI compiler. Parses a `.osts` input file, runs preprocessing,
//! extracts used symbols, and displays summary output. Later, this will produce a reduced `.osts`.

mod osts_reader;
mod compile; 

use std::env;
use osts_reader::{Osts, read_file};

#[allow(unused_imports)]
use compile::{
    source::FrostSource,
    graph,
    code_parser::FunctionParser,
    utils
};

fn main() {
    // Parse CLI arguments
    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        eprintln!("Usage: frostbite <filename.osts>");
        std::process::exit(1);
    }

    let filename = &args[1];
    let content = read_file(filename);

    // Deserialize full .osts JSON into an Osts struct
    let script = Osts::from_string(&content);

    // Extract and separate namespace vs main
    let mut source = FrostSource::from_body(&script.body);
    source.peek("Split into main and fr");

    // Clean up whitespace and comments
    source.preprocess(true);
    source.peek("Removing Comments");
    
    println!("==========Fr Namespace======\n");
    utils::peek_code(&source.fr, 40);
    let fr_namespace = source.extract_function_set();

    println!("Encode: {:?}", fr_namespace.dataframe_methods.get("encode_headers"));
    let fr_precedence_graph = graph::Graph::from_function_set(fr_namespace);

    println!("{:?}",fr_precedence_graph.adj_list.get("encode_headers"));

    // Parse Main and See Which Frost Functions are alled.
    let mut parser = FunctionParser::new();
    parser.parse(&source.main,"fr");
    let mut called_functions = parser.get_methods();
    called_functions.sort();
    
    
    // */
}
