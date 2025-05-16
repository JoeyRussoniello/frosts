use std::fs;
use std::process;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
#[allow(dead_code)] //REMOVE
#[serde(rename_all = "camelCase")]
pub struct Osts {
    pub version: String,
    pub body: String,
    pub description: String,
    pub no_code_metadata: Option<serde_json::Value>,
    pub parameter_info: String,
    pub api_info: String,
}

#[allow(dead_code)] //REMOVE
impl Osts {
    pub fn from_string(json_str: &str) -> Self {
        match serde_json::from_str(json_str) {
            Ok(parsed) => parsed,
            Err(error) => {
                eprintln!("Failed to parse JSON: {}", error);
                std::process::exit(1);
            }
        }
    }

    pub fn to_string(&self) -> String {
        match serde_json::to_string(&self) {
            Ok(s) => s,
            Err(error) => {
                eprintln!("Failed to serialize JSON: {}", error);
                std::process::exit(1);
            }
        }
    }

    pub fn write_to_file(&self, path: &str) {
        let content = self.to_string();
        if let Err(e) = fs::write(path, content) {
            eprintln!("Failed to write to file '{}': {}", path, e);
            std::process::exit(1);
        }
    }
}

pub fn read_file(file_path: &str) -> String {
    match fs::read_to_string(file_path) {
        Ok(content) => content,
        Err(error) => {
            eprintln!("Failed to read file '{}': {}", file_path, error);
            process::exit(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_write_roundtrip() {
        let content = read_file("test_files/empty_test_file.osts");
        let script = Osts::from_string(&content);
        let output_content = script.to_string();
        assert_eq!(content, output_content);
    }
}
