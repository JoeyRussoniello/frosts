//! # frostbite main
//!
//! Entry point for the Frostbite CLI compiler. Parses a `.osts` input file, runs preprocessing,
//! extracts used symbols, and displays summary output. Later, this will produce a reduced `.osts`.

mod osts_reader;
mod compile; 

use std::{env,fs};
//Allow peek_code to not be used without warning since it's a utility field for debugging

use osts_reader::{Osts,read_file};
use compile::compile_from_string;

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

    let compiled= compile_from_string(&script.body).expect("Unable to compile");

    fs::write("compiled.txt",compiled).expect("Unable to write compiled file.");
}
