// Assume frosts is imported here ...

function main(workbook: ExcelScript.Workbook) {
    // See full documentation at: https://joeyrussoniello.github.io/frosts/
    // YOUR CODE GOES HERE
    let sheet = workbook.getWorksheet("Imported Report");
    let cleaned = workbook.getWorksheet("Cleaned Data");
    let df = fr.read_sheet(sheet);

    function fix_dollars(df:fr.DataFrame, col:string){
        //Split the dollar signs
        
        let after_dols = df.apply_string(row => String(row[col]).split("$")[1])
        
        //Coerce to numeric using frosts
        let numeric_dols = fr.to_numeric(after_dols);

        //Assign over the previous col in place
        df.set_column(col,numeric_dols,true);
    }

    let problem_cols = ['Jan',"Feb","Mar","Apr","May","Jun"] //Total gets dropped in cleaning anyways
    problem_cols.forEach(col => fix_dollars(df,col));

    df
        .drop("Total")
        .encode_headers(
            "Region",
            row => row['Product'].toString().includes(":"), //Headers have ":" in the 'Product'
            row => row["Product"].toString().split(": ")[1].split(" (")[0], //Get the text after the ":" in 'Product'
            false //Don't keep the header rows after encoding
        )
        .melt_except(
            "Month", //Unpivot headers into a "Month" column
            "Sales", //Unpivot values into a "Sales" column
            "Region","Product" //Keep Region and Product as identifier columns
        )
        .to_worksheet(cleaned,"o")
}