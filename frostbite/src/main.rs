mod osts_reader;
mod compile;

use std::{env};
use arboard::Clipboard;
use compile::{compile_from_string,utils::find_file};
use osts_reader::{read_file, Osts};


fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: frostbite <filename.osts>");
        std::process::exit(1);
    }

    let target_file = &args[1];
    let path = find_file(target_file).expect("Could not find the specified script.");

    println!("📄 Found script at: {}", path);

    let content = read_file(&path);
    let script = Osts::from_string(&content);

    let compiled = compile_from_string(&script.body).expect("Compilation failed.");

    let mut clipboard = Clipboard::new().expect("Clipboard not available");
    clipboard.set_text(compiled.clone()).expect("Failed to copy to clipboard");

    println!("✅ Frostbite compilation complete. Output copied to clipboard.");
}
