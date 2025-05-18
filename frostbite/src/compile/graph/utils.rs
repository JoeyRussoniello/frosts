//Utility Type Aliases for graph
use std::collections::HashMap;

pub type Vertex = String;
pub type EdgeList = Vec<Vertex>;
pub type AdjList = HashMap<String,EdgeList>;


/// Read an input string s and strip the generic typic
pub fn strip_generics(s: &str) -> String {
    s.split('>').next().unwrap_or(s).to_string()
}