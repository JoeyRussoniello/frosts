//Utility Type Aliases for graph
use std::collections::HashMap;

pub type Vertex = String;
pub type EdgeList = Vec<Vertex>;
pub type AdjList = HashMap<String,EdgeList>;