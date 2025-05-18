    pub mod utils; 

    use std::collections::{HashMap,HashSet,VecDeque};
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
                    
                    n += 1;
                    adj_list.insert(strip_generics(orig_method), parser.get_methods());
                });
            
            let mut g = Graph{n, adj_list};
            g.clean_edges();
            return g;
        }

        // A function that cleans the edges of the call graph to drop any edges that aren't locally defined
        fn clean_edges(&mut self) {
            let defined: HashSet<&String> = self.adj_list.keys().collect();

            // First collect updates into a vector
            let updates: Vec<(String, Vec<String>)> = self
                .adj_list
                .iter()
                .map(|(node, edges)| {
                    let cleaned_edges = edges
                        .iter()
                        .filter(|callee| defined.contains(callee))
                        .cloned()
                        .collect();
                    (node.clone(), cleaned_edges)
                })
                .collect();

            // Now apply updates — no borrow conflict
            for (node, new_edges) in updates {
                self.adj_list.insert(node, new_edges);
            }
        }

        //Print method used for debugging
        #[allow(dead_code)]
        pub fn print(&self){
            println!("Number of vertices: {}",self.n);
            println!("Adjacency Hashmap: {:#?}",self.adj_list);
        }

        pub fn reachable_from(&self, roots: &Vec<String>) -> HashSet<String> {
            let mut visited = HashSet::new();
            let mut queue: VecDeque<String> = VecDeque::new();

            for root in roots {
                if self.adj_list.contains_key(root) {
                    visited.insert(root.clone());
                    queue.push_back(root.clone());
                } else {
                    println!("⚠️  Entry function '{}' not found in graph.", root);
                }
            }

            while let Some(current) = queue.pop_front() {
                if let Some(callees) = self.adj_list.get(&current) {
                    for callee in callees {
                        if visited.insert(callee.clone()) {
                            queue.push_back(callee.clone());
                        }
                    }
                }
            }

            visited
        }
    }

#[cfg(test)]
mod tests {
    use super::*;
    // Minimal FrostFunctionSet mock (already defined elsewhere in your project)
    use crate::compile::source::FrostFunctionSet;
    fn make_frost_set(methods: &[(&str, &str)]) -> FrostFunctionSet {
        let dataframe_methods = methods
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        FrostFunctionSet {
            always_take: String::new(),
            dataframe_methods,
        }
    }

    #[test]
    fn graph_single_function_no_calls() {
        let funct_set = make_frost_set(&[("filter", "")]);
        let graph = Graph::from_function_set(funct_set);

        assert_eq!(graph.n, 1);
        assert_eq!(graph.adj_list["filter"], Vec::<String>::new());
    }

    #[test]
    fn graph_self_recursive_function() {
        let funct_set = make_frost_set(&[("print", "this.print();")]);
        let graph = Graph::from_function_set(funct_set);

        assert_eq!(graph.adj_list["print"], vec!["print"]);
    }

    #[test]
    fn graph_one_function_calls_another() {
        let funct_set = make_frost_set(&[
            ("head", "this.tail();"),
            ("tail", ""),
        ]);
        let graph = Graph::from_function_set(funct_set);

        assert_eq!(graph.adj_list["head"], vec!["tail"]);
        assert_eq!(graph.adj_list["tail"], Vec::<String>::new());
    }

    #[test]
    fn graph_ignores_external_calls() {
        let funct_set = make_frost_set(&[("apply", "this.map();")]);
        let graph = Graph::from_function_set(funct_set);

        assert!(graph.adj_list["apply"].is_empty()); // map isn't defined
    }
}
