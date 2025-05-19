use std::io::{self, Write};
use arboard::Clipboard;

mod osts_reader;
mod compile;

use compile::{compile_from_string, utils::find_files};
use osts_reader::{read_file, Osts};

fn main() {
    println!("❄️ Welcome to Permafrost!");
    println!("What frosts file would you like to condense?");
    println!("(We'll search in Documents, Downloads, and this directory)");
    println!("Note: The filename is case-sensitive and must include the `.osts` extension.\n");

    let path = loop {
        print!("Enter file name (e.g., `frosts.osts`): ");
        io::stdout().flush().unwrap();

        let mut filename = String::new();
        io::stdin().read_line(&mut filename).unwrap();
        let filename = filename.trim();

        match find_files(filename) {
            Ok(paths) if paths.len() == 1 => break paths[0].clone(),
            Ok(paths) if paths.len() > 1 => {
                println!("\n🔎 Found multiple matching files:");
                for (i, path) in paths.iter().enumerate() {
                    println!("  [{}] {}", i + 1, path.display());
                }
                print!("\nEnter number of the file to use: ");
                io::stdout().flush().unwrap();

                let mut choice = String::new();
                io::stdin().read_line(&mut choice).unwrap();

                if let Ok(index) = choice.trim().parse::<usize>() {
                    if index >= 1 && index <= paths.len() {
                        break paths[index - 1].clone();
                    }
                }

                println!("⚠️ Invalid selection. Try again.\n");
            }
            _ => {
                println!("❌ No matching file found. Please try again (inputs are case-sensitive and require the .osts extension.\n");
            }
        }
    };

    println!("\n📄 Found script at: {}\nBeginning Compilation...\n", path.display());

    let content = read_file(&path.display().to_string());
    let script = Osts::from_string(&content);

    let compiled = compile_from_string(&script.body).expect("❌ Compilation failed.");

    let mut clipboard = Clipboard::new().expect("❌ Clipboard not available.");
    clipboard.set_text(compiled.clone()).expect("❌ Failed to copy to clipboard.");

    println!("✅ Frostbite compilation complete. Output copied to clipboard.");

    pause_terminal();
}

fn pause_terminal() {
    print!("Press Enter to exit...");
    io::stdout().flush().unwrap();
    let _ = io::stdin().read_line(&mut String::new());
}
