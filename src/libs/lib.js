const fs = require("fs");
const { Message } = require('botgram/lib/model');

const libUtils = require('./libUtils');
const libVote = require('./libVote'); 
const queriesFile = require("../const/queries.js");
const queries = queriesFile["queries"];
const libCollage = require('./libCollageImages'); 

const vocabularyFile = require("../const/vocabulary.js");
const vocabulary = vocabularyFile["vocabulary"];

const types = {"C": "categoria", "M":"marca", "P":"principi_attivi"};


exports.addToQueryIsBio = function (query, isBio) {
    
    if (isBio == 'S')
        query += ' AND isBio = true'
    else if (isBio == 'N')
        query += ' AND isBio = false'

    return query;
}

// PASSO X.1.A
exports.startSearch = async function (conInfo, msg, reply, type) {

    // create inlineKeyboard
    let inlineKeyboard = await createX1inlineKeyboard(conInfo, type, msg.chat.id)

    // invio messaggio
    if (inlineKeyboard.length == 0)
        reply.text('Non sono presenti ' + vocabulary[type].plurale)
    else
        reply.inlineKeyboard(inlineKeyboard).text('Ecco ' + vocabulary[type].articoloPlurale + ' ' + vocabulary[type].plurale + ', si prega di sceglierne un' + vocabulary[type].genere)
    
}

// PASSO X.1.B
exports.restartSearch = async function (conInfo, reply, data, query) {
    
    let type = data.h[0]

    // create inlineKeyboard
    let inlineKeyboard = await createX1inlineKeyboard(conInfo, type, data.c)

    // invio messaggio
    if (inlineKeyboard.length == 0)
        reply.text('Non sono presenti ' + vocabulary[type].plurale).then()
    else
        reply.inlineKeyboard(inlineKeyboard).editText(query.message, 
            'Ecco ' + vocabulary[type].articoloPlurale + ' ' + vocabulary[type].plurale + ', si prega di sceglierne un' + vocabulary[type].genere).then()
    query.answer()

}

createX1inlineKeyboard = async function (conInfo, type, chatId) {
    let typeLong = types[type];

    // search data
    let querySql = queries[type].start
    let result = await libUtils.makeSqlCall(conInfo, querySql, [])

    // create inlineKeyboard
    let inlineKeyboard = []
    for (let row of result) {
        let value = row[typeLong];
        let msgJson = libUtils.fromJsonToMsg({ h: [type, value], c: chatId })
        inlineKeyboard.push([{ text: value, callback_data: JSON.stringify(msgJson) }])
    }
    return inlineKeyboard;
}

// PASSO X.2
exports.askIfBio = async function (conInfo, reply, data, query) {

    let type = data.h[0]
    let value = data.h[1]
    let typeLong = types[type];

    let querySql = queries[type].bio 
    let result = await libUtils.makeSqlCall(conInfo, querySql, [value])

    let inlineKeyboard = []

    if (result.length != 0) {
        inlineKeyboard = [
            [{ text: 'BIO', callback_data: JSON.stringify(
                libUtils.fromJsonToMsg({ h: [type, value, 'S'], c: data.c })) }],
            [{ text: 'NON BIO', callback_data: JSON.stringify(
                libUtils.fromJsonToMsg({ h: [type, value, 'N'], c: data.c })) }],
            [{ text: 'Indifferente', callback_data: JSON.stringify(
                libUtils.fromJsonToMsg({ h: [type, value, 'I'], c: data.c })) }],
            [{ text: 'INDIETRO', callback_data: JSON.stringify(
                libUtils.fromJsonToMsg({ h: [type], c: data.c })) }]
        ]

        reply.inlineKeyboard(inlineKeyboard).editText(query.message, 'Selezionare la tipologia di ' + vocabulary[type].singolare).then()
    } else {
        data.h.push('X');
        this.showTisaneGallery(conInfo, reply, data, query, type)
    } 

    query.answer()
}

// PASSO X.3.A
exports.showTisaneGallery = async function (conInfo, reply, data, query) {
    let type = data.h[0]
    let value = data.h[1]
    // insert index photo
    data.h.push(0);
    let typeLong = types[type];

    let isBio = 'X'
    if (data.h.length > 2) // caso in cui la tipologia non presenta cose BIO 
        isBio = data.h[2]

    let querySql = queries[type].all
    if (typeLong=='C' && value == 'Tè e Tisane a Freddo')
        querySql = queries[type].freddo

    querySql = this.addToQueryIsBio(querySql, isBio)
    let result = await libUtils.makeSqlCall(conInfo, querySql, [value])
    
    let idTisana = result[0].id
    let resultMeanVote = await libVote.textMean(conInfo, idTisana);

    let text = idTisana + ' - ' + result[0].nome + ', ' + result[0].marca + "\n"
    if (resultMeanVote[0].count > 0) 
        text += "     Voto medio : " + Number(resultMeanVote[0].mean).toFixed(2) + " (" + resultMeanVote[0].count + " voti)"
    
    reply.deleteMessage(query.message).then();

    let inlineKeyboard = []

    if (result.length != 0) {
        
        reply.photo(fs.createReadStream("../files/foto_tisane/" + result[0].id + ".jpg")).then()

        inlineKeyboard = await createX3inlineKeyboardNotEmpty(data, result);

        reply.text(text)
        reply.inlineKeyboard(inlineKeyboard).text('Catalogo ' + value).then()
    } else {

        inlineKeyboard = await createX3inlineKeyboardEmpty(data);

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
    let result = await libUtils.makeSqlCall(conInfo, querySql, [value])
    
    let text = ''

    // TODO : calcolo indice

    if (data.a == 'L' || data.h.length > 4) {
        
        await this.showListTisane(conInfo, reply, data, query, result, type)
        return
    }
    else if (data.a != 'L')
        index = libUtils.calculateNewIndex(data, index, result)

    data.h[3] = index

    let idTisana = result[index].id
    let resultMeanVote = await libVote.textMean(conInfo, idTisana);

    text += idTisana + ' - ' + result[index].nome + ', ' + result[index].marca + "\n"
    if (resultMeanVote[0].count > 0) 
        text += "     Voto medio : " + Number(resultMeanVote[0].mean).toFixed(2) + " (" + resultMeanVote[0].count + " voti)"

    reply.deleteMessage(query.message);

    let inlineKeyboard = []

    if (result.length != 0) {
    
        // show photo of choosed infusion
        reply.photo(fs.createReadStream("../files/foto_tisane/" + result[index].id + ".jpg")).then()

        inlineKeyboard = await createX3inlineKeyboardNotEmpty(data, result)

        reply.text(text)
        reply.inlineKeyboard(inlineKeyboard).text('Catalogo ' + value).then()
    } else {
       
        inlineKeyboard = await createX3inlineKeyboardEmpty(data);

        reply.inlineKeyboard(inlineKeyboard).editText(query.message, "Non sono presenti risultati per la tipologia scelta").then()
    }

    query.answer()
}

createX3inlineKeyboardNotEmpty = async function (data, result) {
    
    let type = data.h[0]
    let value = data.h[1]
    let isBio = data.h[2]
    let index = data.h[3]

    let inlineKeyboard = []

    let indexFoto = index + 1 // per mostrare
    inlineKeyboard = [
        [
            { text: '<', callback_data: JSON.stringify(
                libUtils.fromJsonToMsg({ h: [type, value, isBio, index], c: data.c, a: '<' })) }, //, d: idPhoto })) },
            { text: indexFoto + " / " + result.length, callback_data: '{prova : "prova"}' },
            { text: '>', callback_data: JSON.stringify(
                libUtils.fromJsonToMsg({ h: [type, value, isBio, index], c: data.c, a: '>' })) } //, d: idPhoto })) }
        ]
    ]

    // YO SHOW ALL INFUSIONS AS LIST
    inlineKeyboard.push(
        [{ text: 'LISTA COMPLETA', callback_data: JSON.stringify(
            libUtils.fromJsonToMsg({ h: [type, value, isBio, index], c: data.c, a: 'L' })) }] //, d : idPhoto })) }]
    )

    inlineKeyboard.push(
        [{ text: 'VOTA', callback_data: JSON.stringify(
            libUtils.fromJsonToMsg({ h: [type, value, isBio, index], c: data.c, a: 'V0' })) }] //, d : idPhoto })) }]
    )

    var h = []
    if (isBio != 'X') 
        h = [type, value]
    else // if infusion isn't Bio
        h = [type]
    
    inlineKeyboard.push(
        [{ text: 'INDIETRO', callback_data: JSON.stringify(
            libUtils.fromJsonToMsg({ h: h, c: data.c })) }]// , d: idPhoto})) }]
    )

    return inlineKeyboard;
}

createX3inlineKeyboardEmpty = async function (data) {

    let inlineKeyboard = []
    
    var h = []
    if (isBio != 'X')
        h = [type, value]
    else // is Bio non presente
        h = [type]
    
    inlineKeyboard.push(
        [{ text: 'INDIETRO', callback_data: JSON.stringify(
            libUtils.fromJsonToMsg({ h: h, c: data.c })) }]
    )

    return inlineKeyboard;
}

exports.showOldListTisane = async function (conInfo, reply, data, query, result) {
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
                libUtils.fromJsonToMsg({ h: [type, value, isBio, index], c: data.c })) }]
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

exports.showListTisane = async function (conInfo, reply, data, query, result) {
    let type = data.h[0]
    let value = data.h[1]
    let isBio = data.h[2]
    let index = data.h[3]
    let page = Number(data.h[4])

    let nImagesPage = libCollage.getNImagesPage();

    let maxPages = result.length % nImagesPage == 0 ? 
            result.length / nImagesPage : 
            Math.floor(result.length / nImagesPage) + 1;

    if (page == null || isNaN(page))
        page = 1;
    else {
        if (data.a == '<')
            page = (page - 1) == 0 ? maxPages : --page;
        else if (data.a == '>') 
            page = (page + 1) > maxPages ? 1 : ++page;
    }
    
    let text = ""

    let inlineKeyboard = []

    if (result.length != 0) {

        
        let rowsPage = []
        for (let i = 0; i < result.length; i++) {
            if (i >= (page - 1) * nImagesPage && i < page * nImagesPage) 
                rowsPage.push(result[i]);
        }

        let paths = []
        let ids = []

        for (let row of rowsPage) {
            ids.push(row.id);
            paths.push("../files/foto_tisane/" + row.id + ".jpg");
        }

        // create collage image (promise)
        let imageBufferPromise = libCollage.createCompositeImage(paths, ids);
        
        // to make system faster, sends immediately the image
        let promiseSendImage = imageBufferPromise.then( async (imageBuffer) => {        
            libUtils.writeLog("end creation collage");

            imageBuffer.options = "photo.png"; // ALWAYS set the filename (not needed for file streams)
            reply.photo(imageBuffer).then()
            return "ended";
        })

        reply.deleteMessage(query.message);

        inlineKeyboard = []

        inlineKeyboard.push(
            [
                { text: '<', callback_data: JSON.stringify(
                    libUtils.fromJsonToMsg({ h: [type, value, isBio, index, page], c: data.c, a: '<' })) }, //, d: idPhoto })) },
                { text: page + " / " + maxPages, callback_data: '{prova : "prova"}' },
                { text: '>', callback_data: JSON.stringify(
                    libUtils.fromJsonToMsg({ h: [type, value, isBio, index, page], c: data.c, a: '>' })) } //, d: idPhoto })) }
            ],
            [{ text: 'RITORNA A GALLERIA TISANE', callback_data: JSON.stringify(
                libUtils.fromJsonToMsg({ h: [type, value, isBio, index], c: data.c })) }]
        )

        text += "ID - MARCA - NOME\n"

        // makes everything on the same line
        let maxLength = result[result.length - 1].id.toString().length
        for (let row of rowsPage) {
            let numSpaces = maxLength - row.id.toString().length
            text += "/" + row.id
            text += " ".repeat(numSpaces * 2) // per 2 perchè lo "spazio" prende metà dello ... spazio , pun not intended
            text += " - " + row.marca + " - " + row.nome + "\n"
        }

        // waits photo is sent, such that the order is respected
        await promiseSendImage;
        libUtils.writeLog("sent photo");
        reply.text(text)
        reply.inlineKeyboard(inlineKeyboard).text('Pagina ' + page + ' della lista completa per ' + vocabulary[type].articolo + ' ' + vocabulary[type].singolare + ' : ' + value).then()

    } else {
        reply.editText(query.message, "C'è stato un errore, riprovare").then()
    }

    query.answer()
}

exports.searchById = async function (conInfo, reply, id, chatId) {
    
    let text = await libUtils.createTextById(conInfo, id);

    if (text == '') {
        reply.text('Non è presente l\'id : ' + id)
        return
    }
    // MANDO FOTO
    reply.photo(fs.createReadStream("../files/foto_tisane/" + id + ".jpg")).then()

    // creare possibilità di votare
    let inlineKeyboard = []

    inlineKeyboard.push(
        [{ text: 'VOTA', callback_data: JSON.stringify(
            libUtils.fromJsonToMsg({c: chatId, a: 'V0', id: id})) }]
    )

    reply.inlineKeyboard(inlineKeyboard).text(text, "Markdown").then()

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
    
    let result = await libUtils.makeSqlCall(conInfo, query, [])
    
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
            newText += " ".repeat(numSpaces * 2) // multiply by 2 because "space" takes only half ... space , pun not intended
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


