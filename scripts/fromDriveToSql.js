const Excel = require('exceljs');
const filename = 'files/Tisane.xlsx'
const fs = require('fs');

function createValuesRow(data, row, nCol) {
    let result = ''

    for (let col = 0; col < nCol; col++) {
        let value = ''
        if (row < data[col].length) {
            let value = data[col][row]
            if (value == undefined)
                result += '"", '
            else if (typeof value == "number")
                result += value + ', '
            else if (typeof value == "boolean")
                result += value + ', '
            else
                result += '"' + value + '", '
        } else {
            result += '"", '
        }
        
    }
    
    result = result.substring(0, result.length - 2);
    result += ' '

    return result
}

function cleanBooleanValues(data, nRows, booleanColumns) {
    for (let row = 0; row < nRows; row++) {
        for (let booleanColumn of booleanColumns) {
            if (row < data[booleanColumn].length) {
                let value = data[booleanColumn][row]
                if (value == undefined || value.replace(/\s/g, '') == '')
                    data[booleanColumn][row] = false
                else {
                    data[booleanColumn][row] = true
                }
            } else {
                data[booleanColumn].push(false)
            }
        }
    }
    return data
}

async function main() {
    // read from a file
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filename);
    const worksheet = workbook.getWorksheet('Foglio1');
    
    let nColumns = 9
    
    let data = []
    for (let index = 1; index <= nColumns; index++) {
        const column = worksheet.getColumn(index).values;
        
        column.shift() // primo valore sempre null
        column.shift() // secondo valore è l'intestazione
        
        data.push(column)
        
    }
    
    let nRows = data[0].length

    let booleanColumns = [5, 6]
    data = cleanBooleanValues(data, nRows, booleanColumns)

    let sql = '';
    for (let i = 0; i < nRows; i++) {
        sql += 'INSERT INTO Tisane (id, posizione, nome, categoria, marca, isBio, isFreddaToo, ingredienti, descrizione) ' +
               'VALUES (' + createValuesRow(data, i, nColumns) + ');\n'
    }
    sql += 'COMMIT;'
    console.log(sql)

    fs.writeFileSync('files/sql_script.sql', sql);

}



main()
