// Assume frosts is imported here ...

function main(workbook: ExcelScript.Workbook) {
    // Get all of the worksheets to read/write to
    const Employees = workbook.getWorksheet("Employees");
    const Standards = workbook.getWorksheet("Standard Bonuses");
    const TopBonuses = workbook.getWorksheet("Highest Bonuses");
    const GenderGap = workbook.getWorksheet("Gender Gap");
    const Normalized = workbook.getWorksheet("Normalized Salaries");

    //Read the two existing datasets
    let employees = fr.read_sheet(Employees);
    let standard_bonuses = fr.read_sheet(Standards);

    /** Intermediate Example 1: Bonus Variance Detection
     * Merge in standard bonuses and flag employees whose actual bonus exceeds the expected amount.
     */
    employees.validate_key(standard_bonuses, "Title", "warn");

    let bonuses = employees
        .fill_na("Bonus", "value", 0)
        .merge(standard_bonuses, ["Title"], "inner");

    //An alternative for .apply() is .apply_numeric which assumes all numeric inputs and outputs
    let bonus_variance = bonuses.apply_numeric(row => row["Bonus"] - row["Standard Bonus"]);

    bonuses
        .set_column("Bonus Variance", bonus_variance)
        .filter("Bonus Variance", v => v > 0)
        .sortBy({"Bonus Variance":false})
        .get_columns("EmployeeID", 'Title', "Bonus", "Standard Bonus")
        .to_worksheet(TopBonuses, "o");

    /** Intermediate Example 2: Gender Pay Gap Confidence Intervals
     * Use group statistics to calculate a 95% confidence interval for average salary by gender.
     */
    let gender_data = employees.groupBy(
        "Gender",
        {"Salary":["mean","std_dev","count"]}
    );

    //Function to calculate 95% confidence intervals given a row (Central Limit Theorem)
    function confidence_interval(row: fr.FrostRow): string {
        let avg = row.get_number("Salary_mean");
        let std_dev = row.get_number("Salary_std_dev");
        let count = row.get_number("Salary_count");
        const Z = 1.96;
        const se = std_dev / Math.sqrt(count);
        return `[${Math.round(avg - Z * se)}, ${Math.round(avg + Z * se)}]`;
    }

    gender_data
        .set_column("Confidence Interval", gender_data.apply(confidence_interval))
        .to_worksheet(GenderGap, "o");

    /** Intermediate Example 3: Department-Level Salary Normalization
     * Normalize salaries within each department using z-scores.
     */

    //Calculate average salaries and standard deviations for each dept.
    let avg_salaries = employees.groupBy("Department", {"Salary":["mean","std_dev"]});
    let merged = employees.merge(avg_salaries, ["Department"]);

    let z_scores = merged.map_cols_numeric(
        ([val, avg, std_dev]: number[]) => (val - avg) / std_dev,
        "Salary", "Salary_mean", "Salary_std_dev"
    );
    /*The above callback is a little weird. Let's break it down:

    1: ([val, avg, std_dev]:number[]), this notation is to allow the use of map_cols_numeric() which expects an number array
        the parenthesis allow us to type annotate this variable array.
    
    2: => (val - avg)/std_dev. This is the actual z-score calculation
    
    3: "Salary", "Salary_mean", "Salary_std_dev". This maps the rows of the DataFrame to the [val, avg, std_dev] mentioned earlier. 
        "Salary" maps to val, "Salary_mean" to avg, and "Salary_std_dev" to std_dev
    */
    merged
        .set_column("Z Score", z_scores)
        .get_columns("EmployeeID", "Z Score", "Department")
        .to_worksheet(Normalized, "o");
}