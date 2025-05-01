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

  //Helper function for DataFrame Initialization
  function column_violates_separator(key:string){
    if (key.includes(get_separator())){
      throw new Error(`Input key: ${key} contains the interal frost separator ${get_separator()}, this may cause unintended behavior. \n Please modify the column name using df.rename(), or the separator value using the frosts.set_separator()`);
    }
  }

  function detectTypeFromString(s: string): ("string"|"number"|"boolean") {
    if (!s) {
      s = "";
    }
    s = s.toString();
    if (/^-?\d+(\.\d+)?$/.test(s) || s == "") {
      return "number";
    }
    if (['true', 'false'].includes(s.toLocaleLowerCase())) {
      return "boolean"
    }
    else {
      return "string"
    }
  }
  function detectColumn(col: string[]): ("string"|"number"|"boolean") {
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
  function parseValue(input:string|number|boolean,parse_method:("string"|"number"|"boolean")):string|number|boolean{
    switch (parse_method){
      case "string": return input.toString();
      case "boolean": return input.toString() == "true";
      case "number": return parseFloat(input.toString());
      default: throw SyntaxError("Error parsing value: parsing method must be either 'string','boolean',or 'number'");
    }
  }
  export function read_range(range: ExcelScript.Range): DataFrame {
    return new DataFrame(range.getValues());
  }
  export function read_sheet(Sheet: ExcelScript.Worksheet): DataFrame {
    let rng = Sheet.getUsedRange();
    if (!rng){
      throw new Error(`Input Sheet "${Sheet.getName()}" is empty, unable to create DataFrame`);
    }
    return read_range(rng);
  }

  export function read_json(json: string):DataFrame{
    /* Parse an input JSON-coded string to create a DataFrame*/
      return new DataFrame(JSON.parse(json))
  }

  export function read_after(Sheet: ExcelScript.Worksheet, n_rows: number, n_cols: number){
    let rng = Sheet.getUsedRange();
    let new_rng = rng.getOffsetRange(n_rows,n_cols).getUsedRange();
    return read_range(new_rng);
  }

  //Helper function for CSV parsing Fixes occurences like "1,024"
  function remove_chars_within_quotes(longtext: string): string {
    //Removes line breaks and commas within quotes using a stack, runs in O(n) space and memory
    let stklen = 0;
    let newstring = ""
    for (let i = 0; i < longtext.length; i++) {
      let char = longtext[i];
      //Stack counter to determine whether we are inside double quotes
      if (char == '"') {
        if (stklen == 0) {
          stklen = 1;
        }
        else {
          stklen = 0;
        }
        newstring += ""
      }
      //If we are in quotes, these are problem characters.
      else if (stklen == 1 && (char == "\n" || char == ",")) {
        if (char == ",") {
          newstring += ""
        }
        if (char == "\n") {
          newstring += " "
        }
      }
      else {
        newstring += char
      }
    }
    return newstring
  }

  export function read_csv(input_text: string, errors: ("raise" | "coerce") = "raise", start_index: number = 0, line_separator: string = "\n"): DataFrame {
    let cleaned_text = remove_chars_within_quotes(input_text);
    let line_split_arr: string[] = [];
    //Determine splitting method, then split
    if (cleaned_text.includes(line_separator)) {
      line_split_arr = cleaned_text.split(line_separator);
    }
    else {
      console.log(`No split marker in ${cleaned_text}`);
    }

    let output: string[][] = line_split_arr.map(row => row.split(","))

    //Find sizes and reshape array to ensure that the input is square and importable
    
    const maxLength = output.reduce((max, row) => Math.max(max, row.length), 0);
    output.forEach(row => {
      if(row.length != maxLength){
        if (errors=="raise"){
          throw new TypeError("Error in CSV parsing. Rows are not all the same size. This may cause unintended behavior\nIf this is intentional, use errors='coerce'");
        }
        else{
          while (row.length < maxLength) {
            row.push(null);
          }
        }
      }
    });

    return new DataFrame(output.slice(start_index));
  }

  export function to_numeric(column:(string|number|boolean)[]):number[]{
    return column.map(row => parseFloat(row.toString()));
  }

  export type Row = { [key: string]: string | number | boolean };

  export class DataFrame {
    columns: string[]
    __headers: Set<string>
    dtypes: { [key: string]: ("string"|"number"|"boolean") }
    values: Row[];

    constructor(data: (string | number | boolean)[][]) {
      let str_data = data as string[][];
      let headers = str_data[0];
      str_data = str_data.slice(1);
      this.dtypes = {};

      //Fix duplicate headers by adding extra labels
      let times_seen = {};
      headers.forEach((header, i) => {
        if (header in times_seen){
          headers[i] = header + "_"+ times_seen[header]
          times_seen[header] = times_seen[header] + 1;
        }
        times_seen[header] = 1;
      })

      this.columns = headers;
      this.__headers = new Set(this.columns);
      this.values = []
      for (let row of str_data) {
        let row_values: Row = {};
        headers.forEach((header, i) => row_values[header] = row[i]);
        this.values.push(row_values);
      }

      //Enforce type security. Can check all vals in column, but this may slow down other methods
      headers.forEach((header, col_idx) => {
        this.dtypes[header] = detectColumn(str_data.map(row => row[col_idx]))
        if (this.dtypes[header] != "string" && this.values.length > 0 && typeof (this.values[0][header]) == "string") {
          //console.log("Attempting to correct dtypes");
          this.values.map(row => row[header] = parseValue(row[header], this.dtypes[header]));
        }
      });
    }


    set_column(columnName:string, values:(string|number|boolean)[]):DataFrame{
      if(this.values.length != values.length){
        throw new RangeError(`DataFrame and Input Dimensions Don't Match\nDataFrame has ${this.values.length} rows, while input values have ${values.length}`);
      }
      let dtype = detectColumn(values.map(row => row.toString()));
      let output = this.copy()

      if (!output.columns.includes(columnName)){
        output.columns.push(columnName);
        output.__headers.add(columnName);
      }

      output.dtypes[columnName] = dtype;
      for (let [row, index] of output.iterrows()){
        row[columnName] = values[index];
      }
      return output;
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

    __extract_properties():[string[], {[key:string]:("string"|"number"|"boolean")}, Row[]]{
      // Get all of the developer properties of the DataFrame
      return [this.columns, this.dtypes, this.values];
    }
    __assign_properties(columns:string[], dtypes:{[key:string]:("string"|"number"|"boolean")}, values: Row[]){
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

    add_column(columnName:string, values:(string|number|boolean)[]|(string|number|boolean)):DataFrame{
      let new_df = this.copy();

      let inp_values:(string|number|boolean)[];
      if (Array.isArray(values)){
        if (values.length != this.values.length) {
          throw RangeError(`Length Mismatch:\nSize of ${columnName} - ${values.length}\nSize of df ${this.values.length}`);
        }
        inp_values = values;
      }
      else{
        inp_values = Array(this.values.length).fill(values);
      }

      let old_size = new_df.__headers.size;
      new_df.__headers.add(columnName)

      if (new_df.__headers.size == old_size) {
        throw RangeError(`Key "${columnName}" already in df`);
      }
      new_df.columns.push(columnName);
      let dtype = detectColumn(inp_values as string[]);
      new_df.dtypes[columnName] = dtype;

      new_df.values.forEach((row, index) => {
        row[columnName] = inp_values[index]
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

    get_column(key:string):(string|number|boolean)[]{
      this.__check_membership(key);
      return this.values.map(row => row[key]);
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

    fill_na(columnName:(string|string[]|"ALL"), method: ("prev"|"next"|"value"), value?: string|number|boolean):DataFrame{
      if (typeof columnName != "string" || columnName == "ALL"){
        let columns:string[];
        if (columnName == "ALL"){
          columns = this.columns;
        }
        else{
          columns = columnName;
        }

        let df = this.copy()
        columns.forEach(c => df = df.fill_na(c,method,value));
        return df;
      }
      else{
        this.__check_membership(columnName);

        //Deep copy before
        let df = this.copy();

        let replace_value: string | number | boolean;
        switch (method) {
          case "prev":
            let warnings: number[] = [];
            for (let [row, index] of df.iterrows()) {
              if (row[columnName] != "") {
                replace_value = row[columnName];
              }
              else {
                if (replace_value == null) {
                  warnings.push(index);
                }
                row[columnName] = replace_value;
              }
            }

            if (warnings.length > 0) {
              console.log(`WARNING: not all values were replaced (no header value to assign)\nMissed values in rows: ${warnings}`);
            }
            break;
          case "next":
            let to_replace: number[] = [];
            for (let [row, index] of df.iterrows()) {
              if (row[columnName] == "") {
                to_replace.push(index);
              }
              else {
                replace_value = row[columnName];
                while (to_replace.length > 0) {
                  df.values[to_replace.pop()][columnName] = replace_value;
                }
              }
            }

            //If there are non-replaced values at the end of iteration log a warning
            if (to_replace.length > 0) {
              console.log(`WARNING: not all values were replaced (no bottom value to assign)\nMissed values in rows: ${to_replace}`);
            }
            break;
          case "value":
            if (value == null) {
              throw new SyntaxError('If fillNa() method is "value" a value argument must be provided');
            }
            df.values.filter(row => row[columnName] == null).forEach(row => row[columnName] = value);
            break;
          default: throw new SyntaxError('fillNa() method must be "prev", "next", or "value"')
        }
        return df;
      }
    }

    to_worksheet(worksheet:ExcelScript.Worksheet, method: ("o"|"a") = "o"){
      //Include headers only when overwriting
      let export_array:(string|number|boolean)[][] = this.to_array(method == "o");
      let export_range:ExcelScript.Range;
      let [n_rows, n_cols] = this.shape();

      //Overwrite logic
      if (method == "o"){
        //Overwrite the sheet
        worksheet.getUsedRange()?.setValue("");
        //Get entire export range
        export_range = worksheet.getRange("A1").getResizedRange(n_rows, n_cols - 1)
        //Import Just Headers for Property Table Initializations (with names)
        let header_range = worksheet.getRange("A1").getResizedRange(0,n_cols - 1);
        header_range.setValues([this.columns]);
        //Then try to set a table to the export range
        try {
          worksheet.addTable(export_range, true);
        }
        catch {
          console.log(`A table already exists at ${export_range.getAddressLocal()}, proceeding anyways.`);
        }
      }
      //Append logic
      else if (method == "a"){
        let used_rng = worksheet.getUsedRange();
        if (used_rng == null){
          //Recursively use overwrite logic if the appending sheet is empty
          return this.to_worksheet(worksheet,"o");
        }
        //Last row of the existing worksheet
        let end_row = worksheet.getUsedRange().getLastRow()
        //First cell of the import area
        let start_rng = end_row.getOffsetRange(1,0).getColumn(0);
        export_range = start_rng.getResizedRange(n_rows - 1, n_cols - 1); 
      }
      else{
        throw new SyntaxError("Sheet export method must either be 'o' to overwrite or 'a' to append")
      }

      
      //Import all values (including the headers again);
      export_range.setValues(export_array);

      //Print a helpful message if this export wasn't done as a helper method
      if (worksheet.getName() != DEV_SHEET_NAME) {
        console.log(`Dataframe Written to ${export_range.getAddressLocal()}`);
      }
      //*/
    }

    hardcode_formulas(workbook: ExcelScript.Workbook): DataFrame {
    /*
      Calculate and Hardcode all formula results in the input df. 
      Used to aggregate formula based calculations
    */
      let ExportSheet = workbook.addWorksheet(DEV_SHEET_NAME);
      this.to_worksheet(ExportSheet, 'o');
      let calculated_df = new DataFrame(ExportSheet.getUsedRange().getValues());
      ExportSheet.delete();
      return calculated_df
    }

    to_csv(headers:boolean = true, separator:string = ","):string{
      return this.to_array(headers).map(row => row.join(separator)).join("\n");
    }

    melt(newColumnName: string, newValueName:string, ...columns:string[]): DataFrame{
      columns.forEach(col => this.__check_membership(col));

      let cols_set = new Set(columns);
      let other_cols = Array.from(this.__headers).filter(col => !cols_set.has(col));
      let output_values:(string|number|boolean)[][] = [[...other_cols,newColumnName,newValueName]];

      for (let row of this.values){
        let other_vals = other_cols.map(col => row[col]);
        columns.forEach(col => {
          let val = row[col]
          output_values.push([...other_vals,col,val]);
        });
      }
      //console.log(output_values);
      return new DataFrame(output_values);
    }

    melt_except(newColumnName: string, newValueName:string, ...exceptColumns:string[]):DataFrame{
      exceptColumns.forEach(col => this.__check_membership(col));

      let cols_set = new Set(exceptColumns);
      let melt_cols = Array.from(this.__headers).filter(col => !cols_set.has(col));
      return this.melt(newColumnName,newValueName,...melt_cols);
    }

    apply<T>(fn: (row: Row) => T):T[]{
      return this.values.map(row => fn(row));
    }   

    drop_rows(...rows:number[]):DataFrame{
      let df = this.copy();

      let to_avoid = new Set(rows.map(row => {
        if (row >= 0){return row}
        else{
          let adjusted = this.values.length + row;
          if (adjusted < 0){
            throw new RangeError(`Not enough rows in DataFrame\nInput ${row}, while df has ${this.values.length} rows`);
          }
          return adjusted;
        }
      }));

      df.values = df.values.filter((_, index) => !to_avoid.has(index));
      return df;
    }

    head(n_rows:number = 10):DataFrame{
      if (this.values.length <= n_rows){return this}
      let df = this.copy();
      df.values = this.values.slice(0,n_rows);
      return df;
    }

    tail(n_rows:number = 10):DataFrame{
      if (this.values.length <= n_rows) { return this }
      let df = this.copy();
      df.values = this.values.slice(this.values.length - n_rows);
      return df;
    }

    print(n_rows: number = 5) {
      const totalRows = this.values.length;
      const headers = this.columns;

      const headRows = this.head(n_rows).values;
      const tailRows = this.tail(n_rows).values;

      const rowsToPrint = totalRows <= n_rows * 2 ? this.values : [...headRows, "...", ...tailRows];

      // Convert values to array of arrays for consistent handling
      const dataArray = rowsToPrint.map(row => {
        if (row === "...") return "...";
        return headers.map(col => row[col] !== undefined ? String(row[col]) : "");
      });

      // Calculate column widths based on max length
      const colWidths = headers.map((header, i) => {
        const maxDataWidth = dataArray.reduce((max, row) => {
          if (row === "...") return max;
          return Math.max(max, row[i]?.length || 0);
        }, header.length);
        return maxDataWidth;
      });

      // Format header and divider
      const pad = (text: string, width: number) => text.padEnd(width, " ");
      const headerRow = "| " + headers.map((h, i) => pad(h, colWidths[i])).join(" | ") + " |";
      const divider = "| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |";

      // Format data rows
      const dataRows = dataArray.map(row => {
        if (row === "...") {
          return "| " + colWidths.map(w => pad("...", w)).join(" | ") + " |";
        } else {
          return "| " + row.map((val, i) => pad(val, colWidths[i])).join(" | ") + " |";
        }
      });

      let [number_of_df_rows, n_cols] = this.shape();
      let size_statement = `(${number_of_df_rows} rows x ${n_cols} columns)`
      console.log([headerRow, divider, ...dataRows,"",size_statement].join("\n"));
    }

    validate_key(key:DataFrame, on: [string,string]|string, errors: ("raise" | "return") = "raise"):(string|number|boolean)[]|void{
      let left_on:string;
      let right_on:string;

      if (typeof(on) == 'string'){
        [left_on, right_on] = [on, on];
      }
      else{
        [left_on, right_on] = on;
      }

      this.__check_membership(left_on);
      key.__check_membership(right_on);

      let left_values = this.get_column(left_on);
      let right_values = new Set(key.get_column(right_on));

      let not_in_key = left_values.filter(v => !right_values.has(v));

      if (not_in_key.length != 0){
        if (errors == "raise"){
          throw new Error(`KeyIncompleteError: The following values were not found in the selected key\n[${not_in_key.join(',')}]`)
        }
        else{
          return not_in_key;
        }
      }
    }

    __overwrite_to_table(table:ExcelScript.Table){
      let table_rng = table.getRange();
      let n_table_rows = Number(table_rng.getLastRow().getEntireRow().getAddress().split(":")[1])-1;
      let n_table_cols = table.getHeaderRowRange().getValues()[0].length;

      let [n_df_rows,n_df_cols] = this.shape();

      //Delete excess table columns
      if (n_table_cols > n_df_cols){
        let diff = n_df_cols - n_table_cols + 1 //Add one for column resizing
        let last_col = table_rng.getLastColumn();

        let delete_rng = last_col.getResizedRange(0,diff);

        console.log(`Existing Table Has Too Many Columns. Deleting Range: ${delete_rng.getAddressLocal()}`);
        delete_rng.delete(ExcelScript.DeleteShiftDirection.left);
        table_rng = table.getRange();
      }
      //Delete excess table rows
      if (n_table_rows > n_df_rows){
        let diff = n_df_rows - n_table_rows + 1;
        let last_row = table_rng.getLastRow();

        let delete_rng = last_row.getResizedRange(diff,0);

        console.log(`Existing Table Has Too Many Rows. Deleting Range: ${delete_rng.getAddressLocal()}`);
        delete_rng.delete(ExcelScript.DeleteShiftDirection.up);
        table_rng = table.getRange();
      }

      //Get the starting point of the table
      let table_start = table_rng.getCell(0,0);
      let overwrite_vals = this.to_array(true);

      table_start.getResizedRange(n_df_rows,n_df_cols - 1).setValues(overwrite_vals);
    }

    __append_to_table(table:ExcelScript.Table){
      let rng = table.getRange();
      let first_cell = rng.getLastRow().getCell(0,0).getOffsetRange(1,0);

      //Mapping onto new table logic
      let headers = table.getHeaderRowRange().getValues()[0] as string[];
      let header_set = new Set(headers);

      let not_found_in_df = headers.filter(h => !(this.__headers.has(h)));
      let not_found_in_table = this.columns.filter(c => !(header_set.has(c)));

      if (not_found_in_df.length > 0){
        console.log(`Table Headers not found in DataFrame: ${not_found_in_df}. Filling Values with null...`);
      }
      if (not_found_in_table.length > 0){
        console.log(`Dataframe headers not found in table ${not_found_in_table}. Dropping values to append...`);
      }


      let new_values = this.values.map((row, idx) => {
        return headers.map(h => row[h]) //Map all of the headers onto the new DataFrame
      })
      
      first_cell.getResizedRange(new_values.length - 1, new_values[0].length - 1).setValues(new_values);
    }

    to_table(table:ExcelScript.Table, method:('o'|'a')){
      switch (method){
        case 'o': return this.__overwrite_to_table(table);
        case 'a': return this.__append_to_table(table);
        default: throw new SyntaxError("Table write method must either be 'o' (overwrite), or 'a' (append).")
      }
    }
  }
}
const fr = frosts;

function main(workbook: ExcelScript.Workbook) {
  //YOUR CODE GOES HERE
  // See full documentation and usage instructions here: https://joeyrussoniello.github.io/frosts/
  
}

