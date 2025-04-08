namespace frosts{
  //DEFAULT SEPARATOR FOR MULTIPLE JOINS
  let SEPARATOR = "~~~";
  //ABSTRACT DEV SHEET NAME FOR FORMULA HARDCODING
  const DEV_SHEET_NAME = "___DEV_SHEET_NULL";

  export function get_separator():string{
    return SEPARATOR;
  }
  export function set_separator(separator:string){
    SEPARATOR = separator;
  }
  function column_violates_separator(key:string){
    if (key.includes(get_separator())){
      throw new Error(`Input key: ${key} contains the interal frost separator ${get_separator()}, this may cause unintended behavior. \n Please modify the column name using df.rename(), or the separator value using the frosts.set_separator()`);
    }
  }

  function detectTypeFromString(s: string): string {
    if (!s) {
      s = "";
    }
    s = s.toString();
    if (!(isNaN(parseFloat(s))) || s == "") {
      return "number"
    }
    if (['true', 'false'].includes(s.toLocaleLowerCase())) {
      return "boolean"
    }
    else {
      return "string"
    }
  }
  function detectColumn(col: string[]): string {
    // Detect the type of each value in the column
    let types = col.map(i => detectTypeFromString(i));

    // Check if all types are the same
    const uniqueTypes = Array.from(new Set(types));

    // If there's only one unique type, return that type; otherwise, return "string"
    if (uniqueTypes.length === 1) {
      return uniqueTypes[0];
    } else {
      return "string";
    }
  }
  export function df_from_range(range: ExcelScript.Range): DataFrame {
    return new DataFrame(range.getValues());
  }
  export function df_from_sheet(Sheet: ExcelScript.Worksheet): DataFrame {
    let rng = Sheet.getUsedRange();
    return df_from_range(rng);
  }
  export function write_df_to_sheet(df: DataFrame, workbook: ExcelScript.Workbook, sheet_name: string = "DataFrame", reset_sheet: boolean = true, to_table: boolean = true, start_cell: string = "A1") {
    let Sheet = workbook.getWorksheet(sheet_name);
    if (!Sheet) {
      Sheet = workbook.addWorksheet(sheet_name)
    }

    if (reset_sheet){
      Sheet.getUsedRange()?.setValue("");
    }
    const arr = df.to_array();
    let [n_rows, n_cols] = df.shape();
    let import_range = Sheet.getRange(start_cell).getResizedRange(n_rows, n_cols - 1);

    //Import Just Headers first for Formula Calculation
    Sheet.getRange(start_cell).getResizedRange(0,n_cols- 1).setValues([df.columns]);
    //Then set a table to the import range
    if (to_table) {
      try{
        let table = Sheet.addTable(import_range, true);
      }
      catch {
        console.log(`A table already exists at ${import_range.getAddress()}, proceeding anyways.`);
      }
    }
    //Import all values (including the headers again);
    import_range.setValues(arr);

    //Print a helpful message if this export wasn't done as a helper method
    if (import_range.getWorksheet().getName() != DEV_SHEET_NAME){
      console.log(`Dataframe Written to ${import_range.getAddressLocal()}`);
    }
  }
  export function write_df_to_table(df:DataFrame, table:ExcelScript.Table){
    let table_cols = table.getColumns()

    if (table_cols.length > df.columns.length){
      let overflow_cols = table_cols.slice(df.columns.length);
      let starting_col = overflow_cols[0].getRange().getEntireColumn();

      let deletion_range = starting_col
      if (overflow_cols.length > 1){
        deletion_range = starting_col.getResizedRange(0,overflow_cols.length - 1)
      }
      deletion_range.delete(ExcelScript.DeleteShiftDirection.left);
    }

    table.getRangeBetweenHeaderAndTotal().setValue("");
    let start_cell = table.getRange().getCell(0,0);
    let [n_rows, n_cols] = df.shape();
    
    const arr = df.to_array();
    start_cell.getResizedRange(n_rows, n_cols - 1).setValues(arr);
    //table.getHeaderRowRange();
  }

  export function hardcode_formulas(df:DataFrame, workbook:ExcelScript.Workbook){
    /*
      Calculate and Hardcode all formula results in the input df. 
      Used to aggregate formula based calculations
    */
    write_df_to_sheet(df,workbook,DEV_SHEET_NAME);
    let ExportSheet = workbook.getWorksheet(DEV_SHEET_NAME);
    let calculated_df = new DataFrame(ExportSheet.getUsedRange().getValues());
    df.__assign_properties(...calculated_df.__extract_properties());
    ExportSheet.delete();
  }

  export type Row = { [key: string]: string | number | boolean };
  export class DataFrame {
    columns: string[]
    __headers: Set<String>
    dtypes: { [key: string]: string }
    values: Row[];

    constructor(data: (string | number | boolean)[][]) {
      let str_data = data as string[][];
      let headers = str_data[0];
      str_data = str_data.slice(1);
      this.dtypes = {};
      headers.forEach((header, col_idx) => {
        this.dtypes[header] = detectColumn(str_data.map(row => row[col_idx]))
      });

      //CHECK FOR DUPLICATE HEADERS
      let set_headers = new Set(headers);
      if (headers.length! - set_headers.size) {
        throw new SyntaxError("Duplicate Headers found");
      }

      this.columns = headers;
      this.__headers = set_headers;

      this.values = []
      for (let row of str_data) {
        let row_values: Row = {};
        headers.forEach((header, i) => row_values[header] = row[i]);
        this.values.push(row_values);
      }
    }

    

    to_array(headers: boolean = true): (string | number | boolean)[][] {
      /* Convert the values of the df into a 2D string|number|boolean array */
      if (headers){
        return [this.columns, ...this.values.map(row => Object.values(row))];
      }
      else{
        return this.values.map(row => Object.values(row))
      }
    }

    __check_membership(key: string) {
      if (!(this.__headers.has(key))) {
        throw RangeError(`Key: "${key}" not found in df.\nDf Headers: ${this.columns}`);
      }
    }

    __check_numeric(column: string): number[] {
      this.__check_membership(column);

      const dtype = this.dtypes[column];
      if (dtype !== "number") {
        throw new TypeError(`Column "${column}" is not numeric. Detected type: "${dtype}"`);
      }

      return this.values
        .map(row => row[column])
        .filter(val => typeof val === "number") as number[];
    }

    __extract_properties():[string[], {[key:string]:string}, Row[]]{
      // Get all of the developer properties of the DataFrame
      return [this.columns, this.dtypes, this.values];
    }
    __assign_properties(columns:string[], dtypes:{[key:string]:string}, values: Row[]){
      /* Manually overwrite all of the properties of the DataFrame */
      this.columns = columns;
      this.dtypes = dtypes;
      this.values = values;
      this.__headers = new Set(columns);
    }

    concat(other:DataFrame, columnSelection: ("inner" | "outer" | "left") = "outer"):DataFrame{
      let other_cols = other.columns;

      let columns:string[];
      switch (columnSelection){
        case "inner":
          //List of columns is all shared columns;
          columns = this.columns.filter(col => other.__headers.has(col));
          break;
        case "outer":
          let a = this.columns;
          let b = other.columns;

          //List of columns is all from a, then all from b that aren't in a.
          columns = a.concat(b.filter(col => !this.__headers.has(col)))
          break;
        case "left":
          //List of columns is simply the columns in this df
          columns = this.columns;
          break;
      }

      // Helper to align rows to the unified column set
      function alignRow(row: Row, columns: string[]): Row {
        const aligned: Row = {};
        for (const col of columns) {
          aligned[col] = row[col] ?? null; // Fill missing with null
        }
        return aligned;
      }
      
      const newData: Row[] = [
        ...this.values.map(row => alignRow(row, columns)),
        ...other.values.map(row => alignRow(row, columns)),
      ];

      // Convert back to array-of-arrays for constructor: [columns, ...rows]
      const dataAsMatrix: (string | number | boolean | null)[][] = [
        columns,
        ...newData.map(row => columns.map(col => row[col])),
      ];

      return new DataFrame(dataAsMatrix);
    }

    add_column(columnName:string, values:(string|number|boolean)[]):DataFrame{
      if (values.length != this.values.length){
        throw RangeError(`Length Mismatch:\nSize of ${columnName} - ${values.length}\nSize of df ${this.values.length}`);
      }

      let new_df = this.copy();
      let old_size = new_df.__headers.size;
      new_df.__headers.add(columnName)

      if (new_df.__headers.size == old_size){
        throw RangeError(`Key "${columnName}" already in df`);
      }

      new_df.columns.push(columnName);
      let dtype = detectColumn(values as string[]);
      new_df.dtypes[columnName] = dtype;

      new_df.values.forEach((row, index) => {
        row[columnName] = values[index]
      });

      return new_df;
    }

    copy(): DataFrame {
      // Use JSON to force a deep copy
      return new DataFrame(JSON.parse(JSON.stringify(this.to_array())));
    }
    shape(): [number, number] {
      return [this.values.length, this.columns.length]
    }

    get_columns(...keys: string[]): DataFrame {
      //Check that all keys are present in the df
      keys.forEach(key => this.__check_membership(key));

      let values = this.values.map(row => {
        return keys.map(key => row[key]);
      });

      return new DataFrame([keys, ...values]);
    }

    drop(...columnsToDrop: string[]): DataFrame {
      // Ensure all columns exist before proceeding
      columnsToDrop.forEach(col => this.__check_membership(col));

      // New columns excluding the dropped ones
      const newColumns = this.columns.filter(col => !columnsToDrop.includes(col));

      // New values excluding the dropped columns
      const newValues = this.values.map(row => {
        let newRow: Row = {};
        newColumns.forEach(col => newRow[col] = row[col]); // Keep only selected columns
        return newRow;
      });

      // Convert to DataFrame format
      const resultData = [newColumns, ...newValues.map(row => newColumns.map(col => row[col]))];

      return new DataFrame(resultData);
    }

    filter(key: string, predicate: (value: string | number | boolean) => boolean): DataFrame {
      // Check if the key exists in the dataframe
      this.__check_membership(key);

      // Filter rows based on the predicate function
      const filteredValues = this.values.filter(row => predicate(row[key]));

      // Create a new DataFrame with only the filtered rows
      return new DataFrame([this.columns, ...filteredValues.map(row => this.columns.map(col => row[col]))]);
    }

    // 1. Count non-null values per column
    count(column: string): number {
      this.__check_membership(column);

      return this.values.filter(row => row[column] !== null && row[column] !== undefined && row[column] !== "").length;
    }

    // 2. Sum of numeric column values
    sum(column: string): number {
      const values = this.__check_numeric(column);
      return values.reduce((acc, val) => acc + val, 0);
    }

    // 3. Mean (Average) of a numeric column
    mean(column: string): number {
      const values = this.__check_numeric(column);
      return values.length > 0 ? this.sum(column) / values.length : NaN;
    }

    // Alias for mean
    average(column: string): number {
      return this.mean(column);
    }

    // 4. Minimum value in a numeric column
    min(column: string): number {
      const values = this.__check_numeric(column);
      return values.length > 0 ? Math.min(...values) : NaN;
    }

    // 5. Maximum value in a numeric column
    max(column: string): number {
      const values = this.__check_numeric(column);
      return values.length > 0 ? Math.max(...values) : NaN;
    }

    // 6. Standard Deviation in a numeric columns
    std_dev(column: string, bessel: boolean = true): number {
      const values = this.__check_numeric(column);
      const n = values.length;
      if (n <= 1) return NaN;

      const mean = values.reduce((acc, val) => acc + val, 0) / n;
      const divisor = bessel ? n - 1 : n;

      return Math.sqrt(
        values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / divisor
      );
    }

    //7. Quantiles
    quantile(column: string, q: number): number {
      this.__check_numeric(column); // Ensure the column is numeric
      const values = this.__check_numeric(column).sort((a, b) => a - b); // Sort values
      const pos = (values.length - 1) * q/100;
      const base = Math.floor(pos);
      const rest = pos - base;

      if (values[base + 1] !== undefined) {
        return values[base] + rest * (values[base + 1] - values[base]);
      } else {
        return values[base];
      }
    }

    //8. Median
    median(column:string): number{
      return this.quantile(column, 50);
    }

    unique(column:string): (string|number|boolean)[]{
      this.__check_membership(column);

      return Array.from(new Set(this.values.map(row => row[column])));
    }
    getNumericColumns(): string[] {
      return this.columns.filter(col => this.dtypes[col] === "number");
    }

    describe(): DataFrame {
      const numericCols = this.getNumericColumns();

      const stats = [
        "Count",
        "Mean",
        "Standard Deviation",
        "Minimum",
        "1st Quartile",
        "Median",
        "3rd Quartile",
        "Maximum"
      ];

      const summaryMap: { [col: string]: (string | number)[] } = {};

      for (let col of numericCols) {
        summaryMap[col] = [];

        for (let stat of stats) {
          switch (stat) {
            case "Count":
              summaryMap[col].push(this.count(col));
              break;
            case "Mean":
              summaryMap[col].push(this.mean(col));
              break;
            case "Standard Deviation":
              summaryMap[col].push(this.std_dev(col));
              break;
            case "Minimum":
              summaryMap[col].push(this.min(col));
              break;
            case "1st Quartile":
              summaryMap[col].push(this.quantile(col, 25));
              break;
            case "Median":
              summaryMap[col].push(this.median(col));
              break;
            case "3rd Quartile":
              summaryMap[col].push(this.quantile(col, 75));
              break;
            case "Maximum":
              summaryMap[col].push(this.max(col));
              break;
          }
        }
      }

      const summaryRows: (string | number)[][] = [];

      for (let col of numericCols) {
        summaryRows.push([col, ...summaryMap[col]]);
      }

      return new DataFrame([
        ["Column", ...stats],
        ...summaryRows
      ]);
    }

    groupBy(
      group_keys: string[] | string,
      valueCols: string[] | "all",
      aggFuncs: ("sum" | "mean" | "count" | "min" | "max" | "std_dev")[] | ("sum" | "mean" | "count" | "min" | "max" | "std_dev")
    ): DataFrame {
      let keys: string[];
      if (typeof (group_keys) == "string") {
        keys = [group_keys]
      }
      else {
        keys = group_keys;
      }

      keys.forEach(key => this.__check_membership(key));
      keys.forEach(key => column_violates_separator(key));

      let valueColumns: string[];
      if (typeof (valueCols) == "string") {
        valueColumns = this.getNumericColumns();
        // Filter out any columns that are in the keys list
        valueColumns = valueColumns.filter(col => !keys.includes(col));
      }
      else {
        valueColumns = valueCols;
      }

      valueColumns.forEach(col => this.__check_membership(col));

      // If only one aggFunc is provided, apply it to all valueColumns
      if (typeof (aggFuncs) == "string") {
        aggFuncs = new Array(valueColumns.length).fill(aggFuncs);
      }
      else if (aggFuncs.length === 1) {
        aggFuncs = new Array(valueColumns.length).fill(aggFuncs[0]);
      }


      if (aggFuncs.length !== valueColumns.length) {
        throw new Error(
          `Number of value columns (${valueColumns.length}) must match number of aggFuncs (${aggFuncs.length}), or only one aggFunc should be provided.`
        );
      }

      const grouped: { [groupKey: string]: Row[] } = {};

      for (let row of this.values) {
        const groupKey = keys.map(k => row[k]).join(SEPARATOR);
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(row);
      }

      const aggregatedRows: (string | number | boolean)[][] = [];
      const resultHeaders: string[] = [...keys];

      // Build output headers
      valueColumns.forEach((col, idx) => {
        resultHeaders.push(`${col}_${aggFuncs[idx]}`);
      });

      for (let groupKey in grouped) {
        const rows = grouped[groupKey];
        const groupDF = new DataFrame([
          this.columns,
          ...rows.map(r => this.columns.map(col => r[col])),
        ]);

        const keyParts = groupKey.split(SEPARATOR);
        const aggregatedRow: (string | number | boolean)[] = [...keyParts];

        valueColumns.forEach((col, idx) => {
          const func = aggFuncs[idx];
          let value: number;

          switch (func) {
            case "sum":
              value = groupDF.sum(col);
              break;
            case "mean":
              value = groupDF.mean(col);
              break;
            case "count":
              value = groupDF.count(col);
              break;
            case "min":
              value = groupDF.min(col);
              break;
            case "max":
              value = groupDF.max(col);
              break;
            case "std_dev":
              value = groupDF.std_dev(col);
              break;
          }

          aggregatedRow.push(value);
        });

        aggregatedRows.push(aggregatedRow);
      }

      return new DataFrame([resultHeaders, ...aggregatedRows]);
    }

    operateColumns(operator:("*" | "+" | "-" | "/"), col1: string, col2: string):number[]{
      // Check if both columns exist
      this.__check_membership(col1);
      this.__check_membership(col2);

      // Ensure the columns are numeric
      let nums1 = this.__check_numeric(col1);
      let nums2 = this.__check_numeric(col2);

      // Create the new values array by dividing values of col1 and col2
      const transformedValues = nums1.map((n1, i) => {
        let n2 = nums2[i];
        switch (operator){
          case "+": return n1 + n2
          case "-": return n1 - n2
          case "*": return n1 * n2
          case "/": return n1 / n2
        }
      })
      return transformedValues
    }


    query(condition: (row: Row) => boolean): DataFrame {
      // Filter rows based on the provided condition function
      const filteredValues = this.values.filter(row => condition(row));

      // Convert filtered values into the DataFrame format
      const resultData = [this.columns, ...filteredValues.map(row =>
        this.columns.map(col => row[col])
      )];

      return new DataFrame(resultData);
    }

    isin(column: string, values: Set<string | number | boolean>): DataFrame {
      this.__check_membership(column); // make sure column exists

      // Filter rows where the column's value is in the Set
      const filteredRows = this.values.filter(row => values.has(row[column]));

      // Rebuild data array for new DataFrame
      const dataArray = [
        this.columns,
        ...filteredRows.map(row => this.columns.map(col => row[col]))
      ];

      return new DataFrame(dataArray);
    }

    sortBy(columns: string[], ascending: boolean[] = []): DataFrame {
      // Ensure all columns exist in the DataFrame
      columns.forEach(col => this.__check_membership(col));

      // If only one sorting direction is provided, apply it to all columns
      if (ascending.length === 1) {
        ascending = Array(columns.length).fill(ascending[0]);
      }

      // Sort rows based on columns and their corresponding sort order (ascending or descending)
      const sortedRows = [...this.values].sort((rowA, rowB) => {
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const direction = ascending[i] ? 1 : -1;
          if (rowA[col] < rowB[col]) return -direction;
          if (rowA[col] > rowB[col]) return direction;
        }
        return 0;
      });

      // Rebuild the data array for the new sorted DataFrame
      const dataArray = [
        this.columns,
        ...sortedRows.map(row => this.columns.map(col => row[col]))
      ];

      return new DataFrame(dataArray);
    }

    merge(other: DataFrame, on: string[], how: "inner" | "left" | "outer" = "inner"): DataFrame {
      // Ensure columns to join on exist in both DataFrames
      on.forEach(col => {
        this.__check_membership(col);
        other.__check_membership(col);
      });

      // Join rows based on the selected `how` type
      let mergedRows: Row[] = [];

      switch (how) {
        case "inner":
          // Perform an inner join (only matching rows)
          mergedRows = this.values.filter(row =>
            other.values.some(oRow => on.every(col => row[col] === oRow[col]))
          ).map(row => {
            const matchedRows = other.values.filter(oRow =>
              on.every(col => row[col] === oRow[col])
            );
            return matchedRows.length > 0 ? { ...row, ...matchedRows[0] } : row;
          });
          break;

        case "left":
          // Perform a left join (all rows from the left DataFrame and matching rows from the right)
          mergedRows = this.values.map(row => {
            const matchedRows = other.values.filter(oRow =>
              on.every(col => row[col] === oRow[col])
            );
            return matchedRows.length > 0 ? { ...row, ...matchedRows[0] } : row;
          });
          break;

        case "outer":
          // Perform an outer join (all rows from both DataFrames, matching where possible)
          mergedRows = [
            ...this.values.map(row => {
              const matchedRows = other.values.filter(oRow =>
                on.every(col => row[col] === oRow[col])
              );
              return matchedRows.length > 0 ? { ...row, ...matchedRows[0] } : row;
            }),
            ...other.values.filter(oRow =>
              !this.values.some(row =>
                on.every(col => row[col] === oRow[col])
              )
            )
          ];
          break;

        default:
          throw new Error("Invalid join type. Use 'inner', 'left', or 'outer'.");
      }

      // Combine the columns of both DataFrames, keeping the 'on' columns intact
      const mergedColumns = [
        ...this.columns, // Keep the columns from the left DataFrame
        ...other.columns.filter(col => !on.includes(col)) // Exclude duplicate 'on' columns from the right DataFrame
      ];

      // Rebuild the data array for the new merged DataFrame
      const dataArray = [
        mergedColumns,
        ...mergedRows.map(row => mergedColumns.map(col => row[col] || null)) // Handle any missing values
      ];

      return new DataFrame(dataArray);
    }

    iterrows(): [Row, number][]{
      return this.values.map((row, idx) => [row, idx]);
    }

    to_json(headers:boolean = true):string{
      return JSON.stringify(this.to_array(headers));
    }

    rename(columnsMap: { [oldName: string]: string }): DataFrame {
      // Make sure all keys in columnsMap exist in the DataFrame
      for (let oldCol in columnsMap) {
        this.__check_membership(oldCol);
      }

      // Create new columns array by replacing old column names with new ones
      const newColumns = this.columns.map(col => columnsMap[col] || col);
      
      // Rebuild the data array with updated headers

      return new DataFrame([newColumns, ...this.to_array(false)]);
    }

    add_formula_column(columnName:string, formula:string):DataFrame{
      /* Append a table-style formula column
      Example: [@Col1] + [@Col2]
      */
      let formula_col:string[] = Array(this.shape()[0]).fill(formula);
      return this.add_column(columnName, formula_col);
    }
  }
}

function main(workbook: ExcelScript.Workbook) {
  //YOUR CODE GOES HERE

  /* EXAMPLE CODE:
  let sheet = workbook.getActiveWorksheet();
  let df = frosts.df_from_sheet(sheet);
  
  frosts.write_df_to_sheet(df.describe(), workbook, "New Worksheet"); //Save decription to New Worksheet
  */
  
  let sheet_names = ["Sheet2","Sheet3"];
  let sheets = sheet_names.map(s => workbook.getWorksheet(s));
  let [df1, df2] = sheets.map(s => frosts.df_from_sheet(s));
  
  let both = df1.concat(df2,"outer");
  console.log(both);
}

