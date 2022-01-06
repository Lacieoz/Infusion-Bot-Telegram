const mysql = require('mysql2/promise');
const fs = require("fs");
const { Message } = require('botgram/lib/model');
const libUtils = require('./libUtils');

const types = {"C": "categoria", "M":"marca", "P":"principi_attivi"};

const queries = {
    "C": {
        "start": "SELECT distinct categoria FROM Tisane",
        "bio" : "SELECT * FROM IsBio WHERE categoria = ?",
        "all": "SELECT * FROM Tisane WHERE categoria = ? ",
        "freddo": "SELECT * FROM Tisane WHERE (categoria = ? or isFreddaToo = true)"
    }, "M" : {
        "start": "SELECT marca FROM Tisane GROUP BY marca HAVING count(*) > 1 order by marca",
        "bio" : "SELECT * FROM IsBioMarche WHERE marca = ?",
        "all": "SELECT * FROM Tisane WHERE marca = ? "
    }, "P" : {
        "start": "SELECT distinct(principi_attivi) FROM Tisane.Tisane where principi_attivi != '/' and principi_attivi != ''",
        "bio": "SELECT * FROM IsBioPrinAtt WHERE principi_attivi = ?",
        "all": "SELECT * FROM Tisane WHERE principi_attivi = ? "
    }, "X": {
        "id": "SELECT * FROM Tisane WHERE id = ?",
        "base": "SELECT * FROM Tisane WHERE"
    }
}

const vocabulary = {
    "C": {
        "singolare": "categoria",
        "plurale": "categorie",
        "genere": "a",
        "articolo": "la",
        "articoloPlurale": "le"
    }, "M" : {
        "singolare": "marca",
        "plurale": "marche",
        "genere": "a",
        "articolo": "la",
        "articoloPlurale": "le"
    }, "P" : {
        "singolare": "principio attivo",
        "plurale": "principi attivi",
        "genere": "o",
        "articolo": "il",
        "articoloPlurale": "i"
    }
}

exports.makeSqlCall = async function (conInfo, query, params) {
    
    libUtils.writeLog("Query = " + query)

    // create the connection
    const connection = await mysql.createConnection(conInfo);
    // query database
    const [rows, fields] = await connection.execute(query, params);

    return rows;
}

exports.makeSqlCallNoPrint = async function (conInfo, query, params) {
    
    // create the connection
    const connection = await mysql.createConnection(conInfo);
    // query database
    const [rows, fields] = await connection.execute(query, params);

    return rows;
}

// EX : msg = 'h=cat|S|1,c=2821834921,d=4324832'

exports.fromMsgToJson = function (msgJson) {

    var campiJson = msgJson.m.split(',');
    let jsonParsed = {}
    for (let campo of campiJson) {
        let key = campo.split('=')[0];
        let values = campo.split('=')[1].split('|');
        if (key == 'h') {
            if (values.length == 1 && values[0] == '') {
                jsonParsed[key] = []    
            } else {
                jsonParsed[key] = values
                if (jsonParsed[key].length > 3) {
                    jsonParsed[key][3] = Number(jsonParsed[key][3])
                }
            }
            
        }
        else if (key == 'c') { // chat id
            jsonParsed[key] = Number(values[0])
        }
        else if (key == 'd') { // chat id
            jsonParsed[key] = Number(values[0])
        }
        else {
            jsonParsed[key] = values[0]
        }
    }

    return jsonParsed;
}

exports.fromJsonToMsg = function (msgJson) {

    let keys = Object.keys(msgJson);
    let stringToReturn = {}
    text = ''
    for (let key of keys) {
        text += key + '='
        if (msgJson[key] instanceof Array) {
            if (msgJson[key].length == 0) {
                text += ','
            } else {
                for (let value of msgJson[key]) {
                    text += value + '|' 
                }
                text = text.substring(0, text.length - 1);
                text += ','
            }
        } else {
            text += msgJson[key] + ','
        }
    }
    text = text.substring(0, text.length - 1);
    stringToReturn['m'] = text;

    console.log(stringToReturn)

    return stringToReturn;
}

exports.addToQueryIsBio = function (query, isBio) {
    
    if (isBio == 'S') {
        query += ' AND isBio = true'
    } else if (isBio == 'N') {
        query += ' AND isBio = false'
    } else if (isBio == 'I') {
        // do nothing
    } else if (isBio == 'X') {
        // do nothing
    }

    return query;
}

// PASSO X.1.A
exports.startSearch = async function (conInfo, msg, reply, type) {
    
    let typeLong = types[type];

    // search data
    let query = queries[type].start
    let result = await this.makeSqlCall(conInfo, query, [])

    // create inlineKeyboard
    let inlineKeyboard = []
    for (let row of result) {
        let value = row[typeLong];
        let msgJson = this.fromJsonToMsg({ h: [type, value], c: msg.chat.id })
        inlineKeyboard.push([{ text: value, callback_data: JSON.stringify(msgJson) }])
    }

    // invio messaggio
    if (result.length == 0)
        reply.text('Non sono presenti ' + vocabulary[type].plurale)
    else {
        reply.inlineKeyboard(inlineKeyboard).text('Ecco ' + vocabulary[type].articoloPlurale + ' ' + vocabulary[type].plurale + ', si prega di sceglierne una')
    }
    
}

// PASSO X.1.B
exports.restartSearch = async function (conInfo, reply, data, query) {
    
    let type = data.h[0]
    let typeLong = types[type];

    // search data
    let querySql = queries[type].start
    let result = await this.makeSqlCall(conInfo, querySql, [])

    // create inlineKeyboard
    let inlineKeyboard = []
    for (let row of result) {
        let value = row[typeLong];
        let msgJson = this.fromJsonToMsg({ h: [type, value], c: data.c })
        inlineKeyboard.push([{ text: value, callback_data: JSON.stringify(msgJson) }])
    }
    
    // invio messaggio
    if (result.length == 0)
        reply.text('Non sono presenti ' + vocabulary[type].plurale).then()
    else {
        reply.inlineKeyboard(inlineKeyboard).editText(query.message, 
            'Ecco ' + vocabulary[type].articoloPlurale + ' ' + vocabulary[type].plurale + ', si prega di sceglierne un' + vocabulary[type].genere).then()
    }
    query.answer()

}

// PASSO X.2
exports.askIfBio = async function (conInfo, reply, data, query) {

    let type = data.h[0]
    let value = data.h[1]
    let typeLong = types[type];

    let querySql = queries[type].bio 
    let result = await this.makeSqlCall(conInfo, querySql, [value])

    let inlineKeyboard = []

    if (result.length != 0) {
        inlineKeyboard = [
            [{ text: 'BIO', callback_data: JSON.stringify(
                this.fromJsonToMsg({ h: [type, value, 'S'], c: data.c })) }],
            [{ text: 'NON BIO', callback_data: JSON.stringify(
                this.fromJsonToMsg({ h: [type, value, 'N'], c: data.c })) }],
            [{ text: 'Indifferente', callback_data: JSON.stringify(
                this.fromJsonToMsg({ h: [type, value, 'I'], c: data.c })) }],
            [{ text: 'INDIETRO', callback_data: JSON.stringify(
                this.fromJsonToMsg({ h: [type], c: data.c })) }]
        ]

        reply.inlineKeyboard(inlineKeyboard).editText(query.message, 'Selezionare la tipologia di ' + vocabulary[type].singolare).then()
    } else {
        this.showTisaneGallery(conInfo, reply, data, query, type)
    } 

    query.answer()
}

// PASSO X.3.A
exports.showTisaneGallery = async function (conInfo, reply, data, query) {
    let type = data.h[0]
    let value = data.h[1]
    let typeLong = types[type];

    let isBio = 'X'
    if (data.h.length > 2) // caso in cui la tipologia non presenta cose BIO 
        isBio = data.h[2]

    let querySql = queries[type].all
    if (typeLong=='C' && value == 'Tè e Tisane a Freddo')
        querySql = queries[type].freddo

    querySql = this.addToQueryIsBio(querySql, isBio)
    let result = await this.makeSqlCall(conInfo, querySql, [value])
    
    let text = ''

    let inlineKeyboard = []

    if (result.length != 0) {
        
        text += result[0].id + ' - ' + result[0].nome + ', ' + result[0].marca

        reply.deleteMessage(query.message).then();
        let idPhoto = (await reply.photo(fs.createReadStream("../files/foto_tisane/" + result[0].id + ".jpg")).then()).id

        function byteCount(s) {
            return encodeURI(s).split(/%..|./).length - 1;
        }

        inlineKeyboard = [
            [
                { text: '<', callback_data: JSON.stringify(
                    this.fromJsonToMsg({ h: [type, value, isBio, 0], c: data.c, a: '<' })) }, //, d : idPhoto })) },
                { text: "1 / " + result.length, callback_data: '{prova : "prova"}' },
                { text: '>', callback_data: JSON.stringify(
                    this.fromJsonToMsg({ h: [type, value, isBio, 0], c: data.c, a: '>' })) } //, d : idPhoto })) }
            ]
        ]


        // PER MOSTRARE TUTTE LE TISANE COME LISTA
        inlineKeyboard.push(
            [{ text: 'LISTA COMPLETA', callback_data: JSON.stringify(
                this.fromJsonToMsg({ h: [type, value, isBio, 0], c: data.c, a: 'L' })) }] // , d : idPhoto })) }]
        )

        if (isBio != 'X') { 
            inlineKeyboard.push(
                    [{ text: 'INDIETRO', callback_data: JSON.stringify(
                        this.fromJsonToMsg({ h: [type, value], c: data.c })) }]
                )
        } else { // is Bio non presente
            inlineKeyboard.push(
                [{ text: 'INDIETRO', callback_data: JSON.stringify(
                    this.fromJsonToMsg({ h: [type], c: data.c })) }]
            )
        }

        reply.text(text)
        reply.inlineKeyboard(inlineKeyboard).text('Catalogo ' + value).then()
    } else {

        if (isBio != 'X') { 
            inlineKeyboard.push(
                    [{ text: 'INDIETRO', callback_data: JSON.stringify(
                        this.fromJsonToMsg({ h: [type, value], c: data.c })) }] //, d: idPhoto})) }]
                )
        } else { // is Bio non presente
            inlineKeyboard.push(
                [{ text: 'INDIETRO', callback_data: JSON.stringify(
                    this.fromJsonToMsg({ h: [type], c: data.c })) }] // , d: idPhoto })) }]
            )
        }

        reply.inlineKeyboard(inlineKeyboard).editText(query.message, "Non sono presenti risultati per la tipologia scelta").then()
    }

    query.answer()
}

// PASSO X.3.B
exports.changeTisaneGallery = async function (conInfo, reply, data, query) {
    let type = data.h[0]
    let value = data.h[1]
    let isBio = data.h[2]
    let index = data.h[3]
    let typeLong = types[type];

    let querySql = queries[type].all
    if (typeLong=='C' && value == 'Tè e Tisane a Freddo')
        querySql = queries[type].freddo
    
    querySql = this.addToQueryIsBio(querySql, isBio)
    let result = await this.makeSqlCall(conInfo, querySql, [value])
    
    let text = ''

    if (data.a == '<') {
        index = index - 1
        if (index < 0) 
            index = result.length - 1
        text += result[index].id + ' - ' + result[index].nome + ', ' + result[index].marca + "\n"
    } else if (data.a == '>') {
        index = index + 1

        if (index > result.length - 1) 
            index = 0
        text += result[index].id + ' - ' + result[index].nome + ', ' + result[index].marca + "\n"
    } else if (data.a == 'L') {
        
        await this.showListTisane(conInfo, reply, data, query, result, type)

        return
    } else {
        text += result[index].id + ' - ' + result[index].nome + ', ' + result[index].marca + "\n"
    }

    let inlineKeyboard = []

    if (result.length != 0) {
        
        reply.deleteMessage(query.message);
    
        let idPhoto = (await reply.photo(fs.createReadStream("../files/foto_tisane/" + result[index].id + ".jpg")).then()).id

        let indexFoto = index + 1 // per mostrare
        inlineKeyboard = [
            [
                { text: '<', callback_data: JSON.stringify(
                    this.fromJsonToMsg({ h: [type, value, isBio, index], c: data.chatId, a: '<' })) }, //, d: idPhoto })) },
                { text: indexFoto + " / " + result.length, callback_data: '{prova : "prova"}' },
                { text: '>', callback_data: JSON.stringify(
                    this.fromJsonToMsg({ h: [type, value, isBio, index], c: data.chatId, a: '>' })) } //, d: idPhoto })) }
            ]
        ]

        // PER MOSTRARE TUTTE LE TISANE COME LISTA
        inlineKeyboard.push(
            [{ text: 'LISTA COMPLETA', callback_data: JSON.stringify(
                this.fromJsonToMsg({ h: [type, value, isBio, index], c: data.c, a: 'L' })) }] //, d : idPhoto })) }]
        )

        if (isBio != 'X') { 
            inlineKeyboard.push(
                    [{ text: 'INDIETRO', callback_data: JSON.stringify(
                        this.fromJsonToMsg({ h: [type, value], c: data.c })) }]// , d: idPhoto})) }]
                )
        } else { // is Bio non presente
            inlineKeyboard.push(
                [{ text: 'INDIETRO', callback_data: JSON.stringify(
                    this.fromJsonToMsg({ h: [type], c: data.c, d: idPhoto })) }]
            )
        }

        reply.text(text)
        reply.inlineKeyboard(inlineKeyboard).text('Catalogo ' + value).then()
    } else {
        if (isBio != 'X') { 
            inlineKeyboard.push(
                    [{ text: 'INDIETRO', callback_data: JSON.stringify(
                        this.fromJsonToMsg({ h: [type, value], c: data.c })) }] // , d: idPhoto})) }]
                )
        } else { // is Bio non presente
            inlineKeyboard.push(
                [{ text: 'INDIETRO', callback_data: JSON.stringify(
                    this.fromJsonToMsg({ h: [type], c: data.c })) }] // , d: idPhoto })) }]
            )
        }
        reply.inlineKeyboard(inlineKeyboard).editText(query.message, "Non sono presenti risultati per la tipologia scelta").then()
    }

    query.answer()
}

exports.showListTisane = async function (conInfo, reply, data, query, result) {
    let type = data.h[0]
    let value = data.h[1]
    let isBio = data.h[2]
    let index = data.h[3]
    let typeLong = types[type];

    let text = ""

    let inlineKeyboard = []

    if (result.length != 0) {
        
        reply.deleteMessage(query.message);
        // reply.deleteMessage(data.d);

        inlineKeyboard = []

        // PER MOSTRARE TUTTE LE TISANE COME LISTA
        inlineKeyboard.push(
            [{ text: 'RITORNA A GALLERIA TISANE', callback_data: JSON.stringify(
                this.fromJsonToMsg({ h: [type, value, isBio, index], c: data.c })) }]
        )

        text += "ID - MARCA - NOME\n"

        // METTERE TUTTE LE COSE SULLA STESSA LINEA
        let maxLength = result[result.length - 1].id.toString().length
        for (let row of result) {
            let numSpaces = maxLength - row.id.toString().length
            text += "/" + row.id
            text += " ".repeat(numSpaces * 2) // per 2 perchè lo "spazio" prende metà dello ... spazio , pun not intended
            text += " - " + row.marca + " - " + row.nome + "\n"
        }

        reply.text(text)
        reply.inlineKeyboard(inlineKeyboard).text('Lista completa per ' + vocabulary[type].articolo + ' ' + vocabulary[type].singolare + ' : ' + value).then()
    } else {
        reply.editText(query.message, "C'è stato un errore, riprovare").then()
    }

    query.answer()
}

exports.searchById = async function (conInfo, reply, id) {
    // search data
    let query = queries['X'].id
    let result = await this.makeSqlCall(conInfo, query, [id])
    
    if (result.length == 0) {
        reply.text('Non è presente l\'id : ' + id)
        return
    }

    result = result[0]

    // MANDO FOTO
    await reply.photo(fs.createReadStream("../files/foto_tisane/" + result.id + ".jpg")).then()

    let text = result.id + " - " + result.categoria + '\n'
    text += result.marca + " - " + result.nome + '\n'
    
    if (result.descrizione != '')
        text += '\nDESCRIZIONE\n' + result.descrizione + '\n'
    if (result.ingredienti != '')
        text += '\nINGREDIENTI\n' + result.ingredienti + '\n'
    if (result.isBio == 1) {
        text += '\nBIO - Sì\n'
    } else {
        text += '\nBIO - No\n'
    }
    if (result.isFreddaToo == 1) {
        text += '\nFREDDA - Può essere bevuta anche fredda\n'
    }

    reply.text(text, "Markdown")

}

exports.searchByIngredient = async function (conInfo, reply, ingredients) {

    ingredients = ingredients.replace(/^\s+|\s+$/g, "");
    ingredients = ingredients.replace(/\s+/g, " ");
    ingredients = ingredients.split(" ")

    // search data
    let query = queries['X'].base

    if (ingredients[0].toUpperCase() != 'NO') {
        for (let ingredient of ingredients) {
            query += " nome LIKE '%" + ingredient + "%' OR"
            query += " ingredienti LIKE '%" + ingredient + "%' OR"
            query += " descrizione LIKE '%" + ingredient + "%' OR"
        }
        query = query.substring(0, query.length - 2); // remove last OR
    } else {
        ingredients.shift()
        for (let ingredient of ingredients) {
            query += " nome NOT LIKE '%" + ingredient + "%' AND"
            query += " ingredienti NOT LIKE '%" + ingredient + "%' AND"
            query += " descrizione NOT LIKE '%" + ingredient + "%' AND"
        }
        query = query.substring(0, query.length - 3); // remove last OR
    }
    
    let result = await this.makeSqlCall(conInfo, query, [])
    
    if (result.length == 0) {
        reply.text('Non sono presenti infusi con le parole ricercate')
        return
    }

    if (result.length != 0) {

        let text = "Ecco gli infusi trovati per le parole cercate :\n\n"

        text += "ID - MARCA - NOME\n"

        // METTERE TUTTE LE COSE SULLA STESSA LINEA
        let maxLength = result[result.length - 1].id.toString().length
        for (let row of result) {
            let textOriginal = text
            let numSpaces = maxLength - row.id.toString().length
            let newText = "/" + row.id
            newText += " ".repeat(numSpaces * 2) // per 2 perchè lo "spazio" prende metà dello ... spazio , pun not intended
            newText += " - " + row.marca + " - " + row.nome + "\n"
            if ((new TextEncoder().encode(textOriginal + newText)).length < 4096) {
                text = textOriginal + newText
            } else {
                reply.text(textOriginal)
                text = newText
            }
        }

        reply.text(text)
        
    } else {
        reply.text("C'è stato un errore, riprovare")
    }

}


