namespace frosts{
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
    const arr = df.__array();
    let [n_rows, n_cols] = df.shape();
    let import_range = Sheet.getRange(start_cell).getResizedRange(n_rows - 1, n_cols - 1)
    import_range.setValues(arr);

    if (to_table){
      let table = Sheet.addTable(import_range,true);
    }
    console.log(`Dataframe Written to ${import_range.getAddressLocal()}`);
  }
  type Row = { [key: string]: string | number | boolean };
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

    __array(): (string | number | boolean)[][] {
      return [this.columns, ...this.values.map(row => Object.values(row))];
    }

    __check_membership(key: string) {
      if (!(this.__headers.has(key))) {
        throw RangeError(`Key: "${key}" not found in df.`);
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

      new_df.values.map((row, index) => {
        row[columnName] = values[index]
      });

      return new_df;
    }

    copy(): DataFrame {
      // Create a deep copy of all necessary internal data structures
      let new_values:(string|number|boolean)[][] = JSON.parse(JSON.stringify(this.values)); // Deep copy of values
      let new_columns = [...this.columns]; // Shallow copy of columns (array is simple)

      // Create a new DataFrame using the copied structures
      return new DataFrame([new_columns,...new_values]);
    }
    shape(): [number, number] {
      return [this.values.length + 1, this.columns.length]
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

      const stats = ["Count", "Mean", "Standard Deviation", "Minimum","1st Quartile","Median","3rd Quartile","Maximum"];

      const summaryRows: (string | number)[][] = [];

      for (let stat of stats) {
        const row: (string | number)[] = [stat];

        for (let col of numericCols) {
          switch (stat) {
            case "Count":
              row.push(this.count(col));
              break;
            case "Mean":
              row.push(this.mean(col));
              break;
            case "Standard Deviation":
              row.push(this.std_dev(col));
              break;
            case "Minimum":
              row.push(this.min(col));
              break;
            case "Maximum":
              row.push(this.max(col));
              break;
            
            case "1st Quartile":
              row.push(this.quantile(col,25));
            case "Median": 
              row.push(this.median(col));
            case "3rd Quartile":
              row.push(this.quantile(col,75));
          }
        }

        summaryRows.push(row);
      }

      return new DataFrame([
        ["Column:", ...numericCols],
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
        const groupKey = keys.map(k => row[k]).join("||");
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

        const keyParts = groupKey.split("||");
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

    to_json():string{
      return JSON.stringify(this.__array());
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
}


