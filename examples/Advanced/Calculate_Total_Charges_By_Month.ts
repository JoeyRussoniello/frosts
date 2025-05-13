//Assume frosts namespace is already imported

function main(workbook: ExcelScript.Workbook):string{
    // See full documentation at: https://joeyrussoniello.github.io/frosts/
  
    // Load the reservation data from the "Reservations" sheet
    let sheet = workbook.getWorksheet("Reservations");
    let df = fr.read_sheet(sheet);
  
    // Add derived columns: Length of Stay and Daily Rate
    let with_rate = df
      .set_column(
        "LengthOfStay",
        df.apply_numeric(row => row["Departure"] - row["Arrival"]),
        true // In-place update
      )
      .set_column(
        "Daily Rate",
        df.apply_numeric(row => row["Room Charges"] / row["LengthOfStay"])
        );

    // Unroll each reservation into individual room nights
    let dfs: fr.DataFrame[] = [];
    for (let [row, index] of with_rate.iterrows()) {
      dfs.push(unroll_row(row));
    }
    //Alternatively could have used with_rate.values.map(row => unroll_row(row)) for speed increase,
    //but the above option is a lot more readable!

    // Combine the unrolled rows into one DataFrame
    let combined = fr.combine_dfs(dfs);

    // Summarize performance by property and month
    let output = combined
      .add_formula_column("Month", "=DATE(YEAR([@Date]),MONTH([@Date]),1)")  // Excel formula to extract month
      .hardcode_formulas(workbook, true)                                     // Evaluate formulas
      .groupBy(
        ["Property Name", "Month"], 
        {"Charges":['sum','count']} //Sum and count charges
        ) 
      .rename({ //Rename columns for clarity
        "Charges_sum": "Revenue", 
        "Charges_count": "Room Nights"
        })
      .sortBy(["Property Name", "Month"], [true, true]) //sort ascending for easier reading
    
    //Write output to a worksheet
    output.to_worksheet(workbook.getWorksheet("Performance by Month"));

    //And also export to JSON for Power Automate ETL pipelines
    return output.to_json();
}

  // Unroll one reservation row into 1 row per room night
function unroll_row(row: fr.Row): fr.DataFrame {
    let arrival = Number(row["Arrival"]); // Excel serial date
    let los = row["LengthOfStay"];

    let output: fr.CellValue[][] = [["Guest ID", "Property Name", "Date", "Charges"]];

    for (let i = 0; i < los; i++) {
        let new_row: fr.Row = {
            "Guest ID": row["Guest ID"],
            "Property Name": row["Property Name"],
            "Date": arrival + i, // increment Excel serial number
            "Charges": row["Daily Rate"]
        };

        output.push(fr.row_to_array(new_row));
    }

    return new fr.DataFrame(output);
}