const Excel = require('exceljs');
const fs = require('fs');
const dateFormat = require('dateformat');

// file with data to import
const filename = 'files\\Tisane.xlsx'

const lib = require('../../libs/lib');
const libUtils = require('../../libs/libUtils');

// create a backup
let toBackup = true
// delete data in main table
let toDeleteData = true
// insert new data in main table
let toInsertData = true

var conInfo = {
  host: "192.99.6.159",
  user: "ttesser",
  port: "11030",
  password: "T1s4N3!99",
  database: "Tisane"
};

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

    // CREATE STORICO TABLE
    if (toBackup) {
        var now = new Date();
        let dateFormatString = dateFormat(now, "yyyy_dd_mm__hh_MM_ss")
    
    
        let query = 'CREATE TABLE TisaneStorico_' + dateFormatString + ' SELECT * FROM Tisane;'
        console.log("Creazione tabella storico : TisaneStorico" + dateFormatString)
        await libUtils.makeSqlCallNoPrint(conInfo, query, [])
        console.log("Creazione tabella completata")
    }
    
    // DELETE DATA FROM MAIN TABLE
    if (toDeleteData) {
        console.log("Eliminazione dati tabella Tisane")
        query = 'TRUNCATE TABLE Tisane;'
        await libUtils.makeSqlCallNoPrint(conInfo, query, [])
        console.log("Eliminazione dati completata")
    }
    
    // INSERT NEW DATA
    if (toInsertData) {
        // read from a file
        console.log("Inizio inserimento dati nella tabella Tisane")
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(filename);
        const worksheet = workbook.getWorksheet('Tabella');
        
        let nColumns = 11
        
        let data = []
        for (let index = 1; index <= nColumns; index++) {
            const column = worksheet.getColumn(index).values;
            
            column.shift() // primo valore sempre null
            column.shift() // secondo valore ?? l'intestazione
            
            data.push(column)
            
        }
        
        let nRows = data[0].length

        let booleanColumns = [5, 6]
        data = cleanBooleanValues(data, nRows, booleanColumns)

        query = 'INSERT INTO Tisane (id, posizione, nome, categoria, marca, isBio, isFreddaToo, ingredienti, descrizione, principi_attivi, scadenza) VALUES ';
        for (let i = 0; i < nRows; i++) {
            console.log("Creazione query row " + (i + 1))
            if(i == nRows - 1)
                query += '(' + createValuesRow(data, i, nColumns) + ');'
            else 
                query += '(' + createValuesRow(data, i, nColumns) + '), '
        }

        console.log(query)

        await libUtils.makeSqlCallNoPrint(conInfo, query, [])

        console.log("Finito inserimento dati")

        process.exit(1)
    }
    


}



main()
