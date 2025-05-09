namespace fr {
    //DEFAULT SEPARATOR FOR MULTIPLE JOINS
    let SEPARATOR = "~~~";
    //ABSTRACT DEV SHEET NAME FOR FORMULA HARDCODING
    const DEV_SHEET_NAME = "___DEV_SHEET_NULL#859132";
    //SAMPLE SIZE FOR TYPE CHECKING
    const TYPE_DETECTION_SAMPLE_SIZE = 100;

    export function get_separator(): string {
        return SEPARATOR;
    }
    export function set_separator(separator: string) {
        SEPARATOR = separator;
    }

    //Helper function for DataFrame Initialization
    function column_violates_separator(key: string) {
        if (key.includes(get_separator())) {
            throw new Error(`Input key: ${key} contains the interal frost separator ${get_separator()}, this may cause unintended behavior. \n Please modify the column name using df.rename(), or change the separator value using the fr.set_separator()`);
        }
    }

    function detectTypeFromString(s: string): ("string" | "number" | "boolean") {
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

    //Detect the type of a column from the first and last TYPE_DETECTION_SAMPLE_SIZE/2 entries
    function detectColumn(col: string[]): ("string" | "number" | "boolean") {
        let sample: string[];

        if (col.length <= TYPE_DETECTION_SAMPLE_SIZE) {
            sample = col;
        } else {
            const half = TYPE_DETECTION_SAMPLE_SIZE / 2;
            sample = col.slice(0, half).concat(col.slice(-half));
        }

        const types = sample.map(v => detectTypeFromString(v));
        const uniqueTypes = Array.from(new Set(types));

        //If the number of types spotted ins't 1, just coerce values to string
        return uniqueTypes.length === 1 ? uniqueTypes[0] : "string";
    }

    function parseValue(input: CellValue, parse_method: ("string" | "number" | "boolean")): CellValue {
        switch (parse_method) {
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
        if (!rng) {
            throw new Error(`Input Sheet "${Sheet.getName()}" is empty, unable to create DataFrame`);
        }
        return read_range(rng);
    }

    export function read_json(json: string): DataFrame {
        /* Parse an input JSON-coded string to create a DataFrame*/
        return new DataFrame(JSON.parse(json))
    }

    export function read_after(Sheet: ExcelScript.Worksheet, n_rows: number, n_cols: number) {
        let rng = Sheet.getUsedRange();
        let new_rng = rng.getOffsetRange(n_rows, n_cols).getUsedRange();
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
            // Remove last line if it's empty or whitespace
            if (line_split_arr.length > 0 && line_split_arr[line_split_arr.length - 1].trim() === "") {
                line_split_arr.pop();
            }
        }
        else {
            console.log(`No split marker in ${cleaned_text}`);
        }

        let output: string[][] = line_split_arr.map(row => row.split(","))

        //Find sizes and reshape array to ensure that the input is square and importable

        const maxLength = output.reduce((max, row) => Math.max(max, row.length), 0);
        output.forEach(row => {
            if (row.length != maxLength) {
                if (errors == "raise") {
                    throw new TypeError("Error in CSV parsing. Rows are not all the same size. This may cause unintended behavior\nIf this is intentional, use errors='coerce'");
                }
                else {
                    while (row.length < maxLength) {
                        row.push(null);
                    }
                }
            }
        });

        return new DataFrame(output.slice(start_index));
    }

    export function to_numeric(column: CellValue[]): number[] {
        return column.map(row => parseFloat(row.toString()));
    }

    export function combine_dfs(dfs: DataFrame[], columnSelection: ("inner" | "outer" | "left") = "outer"): DataFrame {
        if (dfs.length == 0) {
            throw RangeError("Please input at least 1 DataFrame to use combine_dfs()")
        }
        else if (dfs.length == 1) {
            return dfs[0];
        }

        let base_df = dfs[0];
        return base_df.concat_all(columnSelection, ...dfs.slice(1));
    }

    //FROST HELPER CALLBACKS TO REDUCE REPETITIVE CODE
    export function sum(nums: number[]): number {
        return nums.reduce((acc, x) => acc + x, 0);
    }
    export function count(nums: number[]): number {
        return nums.filter(x => !isNaN(x)).length;
    }
    export function mean(nums: number[]): number {
        return sum(nums) / nums.length;
    }
    export function min(nums: number[]): number {
        return Math.min(...nums);
    }
    export function max(nums: number[]): number {
        return Math.max(...nums);
    }
    export function range(nums: number[]): number {
        return max(nums) - min(nums);
    }
    export function product(nums: number[]): number {
        return nums.reduce((acc, x) => acc * x, 1);
    }
    
    export const is_blank = (v:CellValue) => v == "";
    export const not_blank = (v: CellValue) => v != "";

    export function not_equal(value: CellValue): (v: CellValue) => boolean {
        return (v: CellValue) => v != value
    }
    export function equal(value: CellValue): (v: CellValue) => boolean {
        return (v: CellValue) => v == value;
    }


    export function row_to_array(row: Row): CellValue[] {
        return Object.values(row);
    }

    export type CellValue = string | number | boolean; //Improve type clarity
    export type Row = { [key: string]: CellValue };

    export class DataFrame {
        columns: string[]
        __headers: Set<string>
        dtypes: { [key: string]: ("string" | "number" | "boolean") }
        values: Row[];

        constructor(data: CellValue[][]) {
            let str_data = data as string[][];
            let headers = str_data[0].map(s => s.trim()); //Trim all headers
            str_data = str_data.slice(1);
            this.dtypes = {};

            //Fix duplicate headers by adding extra labels
            let times_seen = {};
            headers.forEach((header, i) => {
                if (header in times_seen) {
                    headers[i] = header + "_" + times_seen[header]
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

        private __assign_inplace(other: DataFrame, inplace: boolean) {
            if (inplace) {
                this.__assign_properties(...other.__extract_properties());
            }
        }

        set_column(columnName: string, values: CellValue[], inplace: boolean = false): DataFrame {
            if (this.values.length != values.length) {
                throw new RangeError(`DataFrame and Input Dimensions Don't Match\nDataFrame has ${this.values.length} rows, while input values have ${values.length}`);
            }
            let dtype = detectColumn(values.map(row => row.toString()));
            let output = this.copy()

            if (!output.columns.includes(columnName)) {
                output.columns.push(columnName);
                output.__headers.add(columnName);
            }

            output.dtypes[columnName] = dtype;
            for (let [row, index] of output.iterrows()) {
                row[columnName] = values[index];
            }

            this.__assign_inplace(output, inplace);
            return output;
        }

        to_array(headers: boolean = true): CellValue[][] {
            /* Convert the values of the df into a 2D string|number|boolean array */
            if (headers) {
                return [this.columns, ...this.values.map(row => Object.values(row))];
            }
            else {
                return this.values.map(row => Object.values(row))
            }
        }

        private __check_membership(key: string) {
            if (!(this.__headers.has(key))) {
                throw RangeError(`Key: "${key}" not found in df.\nDf Headers: ${this.columns}`);
            }
        }

        private __check_numeric(column: string): number[] {
            this.__check_membership(column);

            const dtype = this.dtypes[column];
            if (dtype !== "number") {
                throw new TypeError(`Column "${column}" is not numeric. Detected type: "${dtype}"`);
            }

            return this.values
                .map(row => row[column])
                .filter(val => typeof val === "number") as number[];
        }

        private __extract_properties(): [string[], { [key: string]: ("string" | "number" | "boolean") }, Row[]] {
            // Get all of the developer properties of the DataFrame
            return [this.columns, this.dtypes, this.values];
        }
        private __assign_properties(columns: string[], dtypes: { [key: string]: ("string" | "number" | "boolean") }, values: Row[]) {
            /* Manually overwrite all of the properties of the DataFrame */
            this.columns = columns;
            this.dtypes = dtypes;
            this.values = values;
            this.__headers = new Set(columns);
        }

        concat(other: DataFrame, columnSelection: ("inner" | "outer" | "left") = "outer"): DataFrame {
            let other_cols = other.columns;

            let columns: string[];
            switch (columnSelection) {
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
            const dataAsMatrix: (CellValue | null)[][] = [
                columns,
                ...newData.map(row => columns.map(col => row[col])),
            ];

            return new DataFrame(dataAsMatrix);
        }

        concat_all(columnSelection: "inner" | "outer" | "left" = "outer", ...others: DataFrame[]): DataFrame {
            const all_dfs = [this, ...others];
            let columnSet: string[];

            // Resolve unified column set based on strategy
            switch (columnSelection) {
                case "inner":
                    // Intersect headers across all DataFrames
                    const shared = all_dfs.map(df => df.__headers);
                    const intersection = shared.reduce((a, b) => {
                        return new Set(Array.from(a).filter(x => b.has(x)));
                    });

                    // Preserve order from this.columns
                    columnSet = this.columns.filter(col => intersection.has(col));
                    break;
                case "outer":
                    const outerSet = new Set<string>();
                    all_dfs.forEach(df => df.columns.forEach(col => outerSet.add(col)));
                    columnSet = Array.from(outerSet);
                    break;
                case "left":
                    columnSet = [...this.columns];
                    break;
            }

            // Align a single row to unified columns
            function alignRow(row: Row, columns: string[]): Row {
                const aligned: Row = {};
                for (const col of columns) {
                    aligned[col] = row[col] !== undefined ? row[col] : null;
                }
                return aligned;
            }

            const end_size = all_dfs.reduce((sum, df) => sum + df.values.length, 0);

            //Align all rows in the combined dfs
            let allRows: Row[] = new Array(end_size);

            let rowIndex = 0;
            for (const df of all_dfs) {
                for (const row of df.values) {
                    allRows[rowIndex++] = alignRow(row, columnSet);
                }
            }

            // Build array-of-arrays for DataFrame constructor
            const dataMatrix: (CellValue | null)[][] = [
                columnSet,
                ...allRows.map(row => columnSet.map(col => row[col]))
            ];

            return new DataFrame(dataMatrix);
        }


        add_column(columnName: string, values: CellValue[] | CellValue, inplace: boolean = false): DataFrame {
            let new_df = this.copy();

            let inp_values: CellValue[];
            if (Array.isArray(values)) {
                if (values.length != this.values.length) {
                    throw RangeError(`Length Mismatch:\nSize of ${columnName} - ${values.length}\nSize of df ${this.values.length}`);
                }
                inp_values = values;
            }
            else {
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

            this.__assign_inplace(new_df, inplace);
            return new_df;
        }

        copy(): DataFrame {
            // Use JSON to force a deep copy
            return new DataFrame(JSON.parse(JSON.stringify(this.to_array())));
        }
        shape(): [number, number] {
            return [this.values.length, this.columns.length]
        }

        get_column(key: string): CellValue[] {
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

        filter(key: string, predicate: (value: CellValue) => boolean, inplace: boolean = false): DataFrame {
            // Check if the key exists in the dataframe
            this.__check_membership(key);

            // Filter rows based on the predicate function
            const filteredValues = this.values.filter(row => predicate(row[key]));

            // Create a new DataFrame with only the filtered rows
            let output = new DataFrame([this.columns, ...filteredValues.map(row => this.columns.map(col => row[col]))]);

            this.__assign_inplace(output, inplace);
            return output;
        }

        // 1. Count non-null values per column
        count(column: string): number {
            this.__check_membership(column);

            return this.values.filter(row => row[column] !== null && row[column] !== undefined && row[column] !== "").length;
        }

        // 2. Sum of numeric column values
        sum(column: string): number {
            const values = this.__check_numeric(column);
            return sum(values)
        }

        // 3. Mean (Average) of a numeric column
        mean(column: string): number {
            const values = this.__check_numeric(column);
            return mean(values)
        }

        // Alias for mean
        average(column: string): number {
            return this.mean(column);
        }

        // 4. Minimum value in a numeric column
        min(column: string): number {
            const values = this.__check_numeric(column);
            return min(values)
        }

        // 5. Maximum value in a numeric column
        max(column: string): number {
            const values = this.__check_numeric(column);
            return max(values)
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
            const pos = (values.length - 1) * q / 100;
            const base = Math.floor(pos);
            const rest = pos - base;

            if (values[base + 1] !== undefined) {
                return values[base] + rest * (values[base + 1] - values[base]);
            } else {
                return values[base];
            }
        }

        //8. Median
        median(column: string): number {
            return this.quantile(column, 50);
        }

        unique(...columns: string[]): DataFrame {
            columns.forEach(c => this.__check_membership(c));

            let combinations_seen = new Set();

            let output: CellValue[][] = [];
            for (let [row, index] of this.iterrows()) {
                const combo = columns.map(c => row[c]);

                let key = JSON.stringify(combo);

                if (!combinations_seen.has(key)) {
                    combinations_seen.add(key);
                    output.push(combo);
                }
            }

            return new DataFrame([columns, ...output]);
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

            const aggregatedRows: CellValue[][] = [];
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
                const aggregatedRow: CellValue[] = [...keyParts];

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

        query(condition: (row: Row) => boolean): DataFrame {
            // Filter rows based on the provided condition function
            const filteredValues = this.values.filter(row => condition(row));

            // Convert filtered values into the DataFrame format
            const resultData = [this.columns, ...filteredValues.map(row =>
                this.columns.map(col => row[col])
            )];

            return new DataFrame(resultData);
        }

        isin(column: string, values: Set<CellValue>): DataFrame {
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

        sortBy(columns: string[], ascending: boolean[] = [], inplace: boolean = false): DataFrame {
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

            let output = new DataFrame(dataArray);

            this.__assign_inplace(output, inplace)
            return output;
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

        iterrows(): [Row, number][] {
            return this.values.map((row, idx) => [row, idx]);
        }

        to_json(headers: boolean = true): string {
            return JSON.stringify(this.to_array(headers));
        }

        rename(columnsMap: { [oldName: string]: string }, inplace: boolean = false): DataFrame {
            // Make sure all keys in columnsMap exist in the DataFrame
            for (let oldCol in columnsMap) {
                this.__check_membership(oldCol);
            }

            // Create new columns array by replacing old column names with new ones
            const newColumns = this.columns.map(col => columnsMap[col] || col);

            // Rebuild the data array with updated headers

            let output = new DataFrame([newColumns, ...this.to_array(false)]);

            this.__assign_inplace(output, inplace)
            return output
        }

        add_formula_column(columnName: string, formula: string, inplace: boolean = false): DataFrame {
            /* Append a table-style formula column
            Example: [@Col1] + [@Col2]
            */
            let formula_col: string[] = Array(this.shape()[0]).fill(formula);
            return this.add_column(columnName, formula_col, inplace);
        }

        fill_na(columnName: (string | string[] | "ALL"), method: ("prev" | "next" | "value"), value?: CellValue): DataFrame {
            if (typeof columnName != "string" || columnName == "ALL") {
                let columns: string[];
                if (columnName == "ALL") {
                    columns = this.columns;
                }
                else {
                    columns = columnName;
                }

                let df = this.copy()
                columns.forEach(c => df = df.fill_na(c, method, value));
                return df;
            }
            else {
                this.__check_membership(columnName);

                //Deep copy before
                let df = this.copy();

                let replace_value: CellValue;
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

        to_worksheet(worksheet: ExcelScript.Worksheet, method: ("o" | "a") = "o") {
            //Include headers only when overwriting
            let export_array: CellValue[][] = this.to_array(method == "o");
            let export_range: ExcelScript.Range;
            let [n_rows, n_cols] = this.shape();

            //Overwrite logic
            if (method == "o") {
                //Overwrite the sheet
                worksheet.getUsedRange()?.setValue("");
                //Get entire export range
                export_range = worksheet.getRange("A1").getResizedRange(n_rows, n_cols - 1)
                //Import Just Headers for Property Table Initializations (with names)
                let header_range = worksheet.getRange("A1").getResizedRange(0, n_cols - 1);
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
            else if (method == "a") {
                let used_rng = worksheet.getUsedRange();
                if (used_rng == null) {
                    //Recursively use overwrite logic if the appending sheet is empty
                    return this.to_worksheet(worksheet, "o");
                }
                //Last row of the existing worksheet
                let end_row = worksheet.getUsedRange().getLastRow()
                //First cell of the import area
                let start_rng = end_row.getOffsetRange(1, 0).getColumn(0);
                export_range = start_rng.getResizedRange(n_rows - 1, n_cols - 1);
            }
            else {
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

        hardcode_formulas(workbook: ExcelScript.Workbook, inplace: boolean = true): DataFrame {
            /*
              Calculate and Hardcode all formula results in the input df. 
              Used to aggregate formula based calculations
            */
            let ExportSheet = workbook.addWorksheet(DEV_SHEET_NAME);
            try {
                this.to_worksheet(ExportSheet, 'o');
            }
            catch {
                //Delete sheet after catching an error
                ExportSheet.delete();
                throw new SyntaxError("Error writing formulas to workbook. Likely incorrect formula syntax");
            }

            let calculated_df = fr.read_sheet(ExportSheet)
            ExportSheet.delete();

            this.__assign_inplace(calculated_df, inplace);
            return calculated_df
        }

        to_csv(headers: boolean = true, separator: string = ","): string {
            return this.to_array(headers).map(row => row.join(separator)).join("\n");
        }

        melt(newColumnName: string, newValueName: string, ...columns: string[]): DataFrame {
            columns.forEach(col => this.__check_membership(col));

            let cols_set = new Set(columns);
            let other_cols = Array.from(this.__headers).filter(col => !cols_set.has(col));
            let output_values: CellValue[][] = [[...other_cols, newColumnName, newValueName]];

            for (let row of this.values) {
                let other_vals = other_cols.map(col => row[col]);
                columns.forEach(col => {
                    let val = row[col]
                    output_values.push([...other_vals, col, val]);
                });
            }
            //console.log(output_values);
            return new DataFrame(output_values);
        }

        melt_except(newColumnName: string, newValueName: string, ...exceptColumns: string[]): DataFrame {
            exceptColumns.forEach(col => this.__check_membership(col));

            let cols_set = new Set(exceptColumns);
            let melt_cols = Array.from(this.__headers).filter(col => !cols_set.has(col));
            return this.melt(newColumnName, newValueName, ...melt_cols);
        }

        //General apply function, needs retyping
        apply<T>(fn: (row: Row) => T): T[] {
            return this.values.map(row => fn(row));
        }

        //Hidden typed apply function
        private __apply_typed<T>(
            fn: (row: { [key: string]: T }) => T,
            caster: (v: CellValue) => T
        ): T[] {
            return this.values.map(original_row => {
                const typed_row: { [key: string]: T } = {};
                Object.entries(original_row).forEach(([key, value]) => {
                    typed_row[key] = caster(value);
                });
                return fn(typed_row);
            });
        }

        //Used typed apply to cast apply as Strings and Nubmers
        apply_numeric(fn: (row: { [key: string]: number }) => number): number[] {
            return this.__apply_typed(fn, Number);
        }
        apply_string(fn: (row: { [key: string]: string }) => string): string[] {
            return this.__apply_typed(fn, String);
        }

        map_cols_numeric(fn: (values: number[]) => number, ...columns: string[]): number[] {
            //Check that all columns are in the df, and that they're numeric
            columns.forEach(c => {
                this.__check_membership(c);
                this.__check_numeric(c);
            })

            return this.values.map(row => {
                const nums = columns.map(c => Number(row[c]));
                return fn(nums);
            })
        }

        drop_rows(...rows: number[]): DataFrame {
            let df = this.copy();

            let to_avoid = new Set(rows.map(row => {
                if (row >= 0) { return row }
                else {
                    let adjusted = this.values.length + row;
                    if (adjusted < 0) {
                        throw new RangeError(`Not enough rows in DataFrame\nInput ${row}, while df has ${this.values.length} rows`);
                    }
                    return adjusted;
                }
            }));

            df.values = df.values.filter((_, index) => !to_avoid.has(index));
            return df;
        }

        head(n_rows: number = 10): DataFrame {
            if (this.values.length <= n_rows) { return this }
            let df = this.copy();
            df.values = this.values.slice(0, n_rows);
            return df;
        }

        tail(n_rows: number = 10): DataFrame {
            if (this.values.length <= n_rows) { return this }
            let df = this.copy();
            df.values = this.values.slice(this.values.length - n_rows);
            return df;
        }

        print(n_rows: number = 5) {
            const totalRows = this.values.length;
            const totalCols = this.columns.length;
            const headers = this.columns;

            const headRows = this.head(n_rows).values;
            const tailRows = this.tail(n_rows).values;
            const rowsToPrint = totalRows <= n_rows * 2 ? this.values : [...headRows, "...", ...tailRows];

            let displayColumns: string[];
            let colIndices: number[];

            if (totalCols <= 4) {
                displayColumns = [...headers];
                colIndices = displayColumns.map((_, i) => i);
            } else {
                // Truncate: first 2, ..., last 2
                displayColumns = [
                    ...headers.slice(0, 2),
                    "...",
                    ...headers.slice(-2)
                ];

                colIndices = [
                    ...[0, 1],
                    -1, // placeholder for ellipsis
                    ...[totalCols - 2, totalCols - 1]
                ];
            }

            // Prepare display rows
            const dataArray = rowsToPrint.map(row => {
                if (row === "...") return "...";

                return colIndices.map(idx => {
                    if (idx === -1) return "...";
                    const col = headers[idx];
                    return row[col] !== undefined ? String(row[col]) : "";
                });
            });

            // Compute column widths
            const colWidths = displayColumns.map((col, i) => {
                return Math.max(
                    col.length,
                    ...dataArray.map(row => row === "..." ? 3 : (row[i]?.length || 0))
                );
            });

            const pad = (text: string, width: number) => text.padEnd(width, " ");

            // Render header + divider
            const headerRow = "| " + displayColumns.map((h, i) => pad(h, colWidths[i])).join(" | ") + " |";
            const divider = "| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |";

            // Render each data row
            const dataRows = dataArray.map(row => {
                if (row === "...") {
                    return "| " + colWidths.map(w => pad("...", w)).join(" | ") + " |";
                }
                return "| " + row.map((val, i) => pad(val, colWidths[i])).join(" | ") + " |";
            });

            const [n_rows_df, n_cols_df] = this.shape();
            const size_statement = `(${n_rows_df} rows x ${n_cols_df} columns)`;

            console.log([headerRow, divider, ...dataRows, "", size_statement].join("\n"));
        }

        validate_key(key: DataFrame, on: [string, string] | string, errors: ("raise" | "return") = "raise"): CellValue[]{
            let left_on: string;
            let right_on: string;

            if (typeof (on) == 'string') {
                [left_on, right_on] = [on, on];
            }
            else {
                [left_on, right_on] = on;
            }

            this.__check_membership(left_on);
            key.__check_membership(right_on);

            let left_values = this.get_column(left_on);
            let right_values = new Set(key.get_column(right_on));

            let not_in_key = left_values.filter(v => !right_values.has(v));

            if (errors == "raise" && not_in_key.length == 0) {
                throw new Error(`KeyIncompleteError: The following values were not found in the selected key\n[${not_in_key.join(',')}]`);
            }

            return not_in_key
        }

        private __overwrite_to_table(table: ExcelScript.Table) {
            let table_rng = table.getRange();
            let n_table_rows = Number(table_rng.getLastRow().getEntireRow().getAddress().split(":")[1]) - 1;
            let n_table_cols = table.getHeaderRowRange().getValues()[0].length;

            let [n_df_rows, n_df_cols] = this.shape();

            //Delete excess table columns
            if (n_table_cols > n_df_cols) {
                let diff = n_df_cols - n_table_cols + 1 //Add one for column resizing
                let last_col = table_rng.getLastColumn();

                let delete_rng = last_col.getResizedRange(0, diff);

                console.log(`Existing Table Has Too Many Columns. Deleting Range: ${delete_rng.getAddressLocal()}`);
                delete_rng.delete(ExcelScript.DeleteShiftDirection.left);
                table_rng = table.getRange();
            }
            //Delete excess table rows
            if (n_table_rows > n_df_rows) {
                let diff = n_df_rows - n_table_rows + 1;
                let last_row = table_rng.getLastRow();

                let delete_rng = last_row.getResizedRange(diff, 0);

                console.log(`Existing Table Has Too Many Rows. Deleting Range: ${delete_rng.getAddressLocal()}`);
                delete_rng.delete(ExcelScript.DeleteShiftDirection.up);
                table_rng = table.getRange();
            }

            //Get the starting point of the table
            let table_start = table_rng.getCell(0, 0);
            let overwrite_vals = this.to_array(true);

            table_start.getResizedRange(n_df_rows, n_df_cols - 1).setValues(overwrite_vals);
        }

        private __append_to_table(table: ExcelScript.Table) {
            let rng = table.getRange();
            let first_cell = rng.getLastRow().getCell(0, 0).getOffsetRange(1, 0);

            //Mapping onto new table logic
            let headers = table.getHeaderRowRange().getValues()[0] as string[];
            let header_set = new Set(headers);

            let not_found_in_df = headers.filter(h => !(this.__headers.has(h)));
            let not_found_in_table = this.columns.filter(c => !(header_set.has(c)));

            if (not_found_in_df.length > 0) {
                console.log(`Table Headers not found in DataFrame: ${not_found_in_df}. Filling Values with null...`);
            }
            if (not_found_in_table.length > 0) {
                console.log(`Dataframe headers not found in table ${not_found_in_table}. Dropping values to append...`);
            }


            let new_values = this.values.map((row, idx) => {
                return headers.map(h => row[h]) //Map all of the headers onto the new DataFrame
            })

            first_cell.getResizedRange(new_values.length - 1, new_values[0].length - 1).setValues(new_values);
        }

        to_table(table: ExcelScript.Table, method: ('o' | 'a')) {
            switch (method) {
                case 'o': return this.__overwrite_to_table(table);
                case 'a': return this.__append_to_table(table);
                default: throw new SyntaxError("Table write method must either be 'o' (overwrite), or 'a' (append).")
            }
        }

        pivot(index: string, columns: string, values: string, aggFunc: ("sum" | "mean" | "count" | "min" | "max" | "std_dev") = "count", fillNa: CellValue = null) {
            this.__check_membership(index);
            this.__check_membership(columns);
            this.__check_membership(values);

            let grouped = this.groupBy(
                [index, columns],
                [values],
                [aggFunc]
            );

            //Get unique row and columns
            const rowKeys = grouped.unique(index).get_column(index);
            const colKeys = grouped.unique(columns).get_column(columns);

            //Read from the grouped table to a hashmap
            let lookup: { [key: string]: CellValue } = {};
            grouped.values.forEach(row => {
                let key = [row[index], row[columns]].join(SEPARATOR);
                let val = row[`${values}_${aggFunc}`];
                lookup[key] = val;
            });

            //Assemble into Matrix 
            const headers = [index, ...colKeys];
            let data = rowKeys.map(rowKey => {
                let colVals = colKeys.map(colKey => {
                    let key = [rowKey, colKey].join(SEPARATOR);
                    return lookup[key] ?? fillNa;
                });
                return [rowKey, ...colVals]
            });

            return new DataFrame([headers, ...data])
        }

        /**
         * Adds a new column with values extracted from header rows and propagated downward.
         * 
         * @param columnName - Name of the column to create
         * @param isHeaderRow - Function that detects if a row is a header
         * @param extractValue - Function that extracts the value from the header row
         * @param keepHeaders - Boolean on whether you'd like to keep the rows flagged as headers in the output DataFrame.
         * @returns A new DataFrame with the header values encoded in the new column
         */
        encode_headers(columnName:string, isHeaderRow: (row: Row)=> boolean, extractValue: (row:Row)=>CellValue, keepHeaders:boolean = false):DataFrame{
            let current_header:CellValue = "";
            let series = this.values.map(row => {
                if (isHeaderRow(row)){
                    current_header = extractValue(row);
                }
                return current_header;
            })

            let output = this.set_column(columnName,series,false);
            //If keepHeaders = false, remove headerRows from the output
            return keepHeaders ? output : output.query(row => !isHeaderRow(row)); 
        }
    }
}

function main(workbook: ExcelScript.Workbook) {
    // See full documentation at: https://joeyrussoniello.github.io/frosts/
    // YOUR CODE GOES HERE
    
}
