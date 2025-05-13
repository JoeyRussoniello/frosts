//Assume frosts namespace imported here

function main(workbook: ExcelScript.Workbook) {
    // See full documentation at: https://joeyrussoniello.github.io/frosts/

    //Sheet Initializations for future outputs
    const data = workbook.getWorksheet("Data");
    const high_salaries = workbook.getWorksheet("High Salaries");
    const w_income_tax = workbook.getWorksheet("With Tax");
    const no_sensitive = workbook.getWorksheet("No SSN");
    const frequencies = workbook.getWorksheet("Frequencies");

    //In a real implementation, the csv may be passed to main as an argument
    //Example: function main(workbook:ExcelScript.workbook, csv_content:string){}
    //Using this, you can hand the script dynamic content using  PowerAutomate

    let csv_content = `EmployeeID,Name,Department,City,Age,Salary,Income,SSN,Address
1001,Alice Smith,Engineering,New York,29,120000,110000,123-45-6789,123 5th Ave
1002,Bob Johnson,HR,Los Angeles,45,85000,80000,987-65-4321,456 Sunset Blvd
1003,Carol Lee,Engineering,New York,34,95000,92000,567-89-1234,789 Madison St
1004,David Kim,Marketing,Chicago,38,72000,70000,234-56-7890,101 Lake Shore Dr
1005,Eva Brown,Sales,New York,26,67000,64000,345-67-8901,234 7th Ave
1006,Frank Wright,Sales,San Francisco,41,69000,66000,456-78-9012,555 Castro St
1007,Grace Hall,HR,Chicago,31,91000,87000,678-90-1234,404 Wacker Dr
1008,Henry Adams,Engineering,San Francisco,27,105000,100000,789-01-2345,808 Mission St
1009,Ivy Clark,Marketing,Los Angeles,36,76000,74000,890-12-3456,321 Rodeo Dr
1010,Jack Davis,Sales,New York,50,83000,80000,901-23-4567,777 Broadway
1011,Liam Young,Engineering,Chicago,33,98000,95000,321-45-6789,999 Lakeside Dr
1012,Mia Wilson,HR,San Francisco,42,87000,82000,876-54-3210,678 Pine St
1013,Noah Moore,Marketing,New York,30,75000,73000,654-32-1987,345 9th Ave
1014,Olivia Taylor,Sales,Los Angeles,28,70000,67000,543-21-9876,210 Wilshire Blvd
1015,Paul Martinez,Engineering,Chicago,46,110000,102000,432-10-8765,890 Michigan Ave
1016,Quinn Hernandez,HR,New York,39,92000,88000,321-98-7654,135 Lexington Ave
1017,Rachel Perez,Marketing,San Francisco,44,88000,84000,210-87-6543,678 Castro St
1018,Sam Roberts,Sales,Chicago,35,68000,64000,109-76-5432,321 Monroe St
1019,Tina Evans,Engineering,Los Angeles,32,115000,108000,098-65-4321,555 Fairfax Ave
1020,Uma Nelson,HR,San Francisco,37,86000,82000,087-54-3210,109 Van Ness Ave
`//Note how an empty row at the end is permissble (but not necessary)


    //Process the csv data, coercing malformed rows
    let df = fr.read_csv(csv_content,"coerce");

    //First, we'll write the DataFrame to ExcelWorksheet as is
    df.to_worksheet(data,'o')

    //And we'll add high salary workers to "High Salaries"
    df
        .filter("Salary", v => v > 100_000)
        .to_worksheet(high_salaries,'o')
    
    //We can also create a custom column for "Income Tax", that's 30% of income
    let income_tax = df.apply(row => row.get_number("Income") * 0.3);
    df
        .add_column("Income Tax",income_tax)
        .to_worksheet(w_income_tax,'o')

    //Note this can also be done with Excel Table Formulas if you are more comfortable with this syntax!
    /*
    df
        .add_formula_column("Income Tax","=[@Income] * 0.3")
        .to_worksheet(w_income_tax,'o')
    */

    //We can also choose to drop columns from a df (like sensitive SSNs and Address)
    df
        .drop("SSN","Address")
        .to_worksheet(no_sensitive,"o");

    //Lastly, let's do a basic aggregation: average salary and num employees by Department and City
    df
        .groupBy(
            ['City',"Department"], //Group By City and Department
            {"Salary":['mean','count']} //Calculate average salary and number of employees
        ) 
        .rename({
            "Salary_mean":"Average Salary",
            "Salary_count":"Num Employees"
        }) //Rename the aggregate columns for clearer interpretations
        .to_worksheet(frequencies,"o");
}