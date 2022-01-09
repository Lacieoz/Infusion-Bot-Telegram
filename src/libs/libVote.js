const libUtils = require('./libUtils');
const lib = require('./lib');
const queriesFile = require("../const/queries.js");
const queries = queriesFile["queries"];

const types = {"C": "categoria", "M":"marca", "P":"principi_attivi"};

exports.voteInfuse = async function (conInfo, reply, data, query) {
    
    let type = data.h[0]
    let value = data.h[1]
    let typeLong = types[type];
    let isBio = data.h[2]
    let index = data.h[3]
    let vote = data.a[1]

    // save vote
    let queryAll = queries[type].all
    if (typeLong=='C' && value == 'Tè e Tisane a Freddo')
        queryAll = queries[type].freddo
    
    queryAll = lib.addToQueryIsBio(queryAll, isBio)
    let result = await libUtils.makeSqlCall(conInfo, queryAll, [value])

    let idTisana = result[index].id;

    let queryInsert = queries["V"].insert
    let dateNow = new Date();

    let params = [idTisana, query.from.username, vote, dateNow]

    let resultInsert = await libUtils.makeSqlCall(conInfo, queryInsert, params)

    let inlineKeyboard = []

    reply.deleteMessage(query.message);

    inlineKeyboard.push(
        [{ text: 'INDIETRO', callback_data: JSON.stringify(
            libUtils.fromJsonToMsg({ h: data.h, c: data.c })) }]
    )
    reply.inlineKeyboard(inlineKeyboard).text('Voto inserito con successo!').then()

    query.answer()
}

exports.askVote = async function (conInfo, reply, data, query) {

    let inlineKeyboard = []
    let unicodeStar = "\u{2B50}"
    reply.deleteMessage(query.message);

    let text = "";

    for (let i = 1; i < 6; i++ ) {
        text += unicodeStar + " ";
        inlineKeyboard.push(
            [{ text: text, callback_data: JSON.stringify(
                libUtils.fromJsonToMsg({ h: data.h, c: data.c, a: 'V' + i })) },
            ]
        )
    }

    inlineKeyboard.push(
        [{ text: 'INDIETRO', callback_data: JSON.stringify(
            libUtils.fromJsonToMsg({ h: data.h, c: data.c })) }]
    )
    reply.inlineKeyboard(inlineKeyboard).text('Che voto dai alla tisana?').then()

    query.answer()
}

exports.textMean = async function (conInfo, idTisana) {

    let queryMean = queries["V"].mean
    let resultMeanVote = await libUtils.makeSqlCall(conInfo, queryMean, [idTisana])

    return resultMeanVote;
}