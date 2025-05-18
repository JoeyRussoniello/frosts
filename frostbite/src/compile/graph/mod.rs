pub mod utils; 

use std::collections::HashMap;
use utils::*;
use super::source::FrostFunctionSet;
use super::code_parser::FunctionParser;

pub struct Graph{
    n: usize,
    pub adj_list: AdjList
}
impl Graph{
    pub fn from_function_set(funct_set: FrostFunctionSet) -> Self {
        let mut adj_list: AdjList = HashMap::new();
        let mut n = 0;

        funct_set
            .dataframe_methods
            .iter()
            .for_each(|(orig_method, code)|{
                //Parse the code for the method
                let mut parser = FunctionParser::new();
                parser.parse(code,"this");
                
                //Janky temporary fix for apply's generic typing
                let mut method = orig_method.to_string();
                if method == "apply<T>"{
                    method = "apply".to_string();
                }

                n += 1;
                adj_list.insert(method, parser.get_methods());
            });
        
        Graph{n, adj_list}
    }
}