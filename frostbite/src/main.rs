//! # frostbite main
//!
//! Entry point for the Frostbite CLI compiler. Parses a `.osts` input file, runs preprocessing,
//! extracts used symbols, and displays summary output. Later, this will produce a reduced `.osts`.

mod osts_reader;
mod compile; 

use std::env;
use osts_reader::{Osts, read_file};

use compile::{
    FrostSource,
    FrUsageTracker
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
    source.preprocess(false);
    source.peek("Removing Comments");

    
    // Track fr usage in the main script
    let tracker = FrUsageTracker::from_main(&source.main);
    tracker.print();

    
    // Extract declared functions from the namespace
    let frost_set = source.extract_function_set();
    println!("\n[Top-level functions: {}]", frost_set.functions.len());
    println!("{:?}", frost_set.functions.keys());

    println!("\n[Top-level export function: {}]", frost_set.exports.len());
    println!("{:?}", frost_set.exports.keys());

    println!("\n[DataFrame methods: {}]", frost_set.dataframe_methods.len());
    println!("{:?}", frost_set.dataframe_methods.keys());
    // */
}
