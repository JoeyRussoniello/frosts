use std::io::{self, Write};
use arboard::Clipboard;

mod osts_reader;
mod compile;

use compile::{compile_from_string, utils::find_file};
use osts_reader::{read_file, Osts};

fn main() {
    println!("❄️ Welcome to Permafrost!");
    println!("What frosts file would you like to condense?");
    println!("(We'll search in Documents, Downloads, and this directory)");

    print!("Enter file name (e.g., `frosts.osts`): ");
    io::stdout().flush().unwrap(); // make sure prompt appears before input

    let mut filename = String::new();
    io::stdin().read_line(&mut filename).unwrap();
    let filename = filename.trim(); // Remove newline

    let path: String = match find_file(filename) {
        Ok(p) => p,
        _ => {
            eprintln!("❌ Could not find a file named `{}` in any of the default directories.", filename);
            std::process::exit(1);
        }
    };

    println!("📄 Found script at: {}", path);

    let content = read_file(&path);
    let script = Osts::from_string(&content);

    let compiled = compile_from_string(&script.body).expect("❌ Compilation failed.");

    let mut clipboard = Clipboard::new().expect("❌ Clipboard not available.");
    clipboard.set_text(compiled.clone()).expect("❌ Failed to copy to clipboard.");

    println!("✅ Frostbite compilation complete. Output copied to clipboard.");
}
