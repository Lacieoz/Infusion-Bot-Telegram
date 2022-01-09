const mysql = require('mysql2/promise');

exports.middleware = function (msg, reply, next) {
    console.info("[%s] Received %s from chat %s (%s)",
        new Date().toISOString(), msg.type, msg.chat.id, msg.chat.name, msg.text);
    console.log(next)        
    next();
}

exports.writeLog = function (string) {
    console.info("[%s] %s",
        new Date().toISOString(), string);
}

exports.isNumeric = function (str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
            !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
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

exports.makeSqlCall = async function (conInfo, query, params) {
    
    this.writeLog("Query = " + query)

    // create the connection
    const connection = await mysql.createConnection(conInfo);
    // query database
    const [rows, fields] = await connection.execute(query, params);

    await connection.end();
    return rows;
}

exports.makeSqlCallNoPrint = async function (conInfo, query, params) {
    
    // create the connection
    const connection = await mysql.createConnection(conInfo);
    // query database
    const [rows, fields] = await connection.execute(query, params);

    return rows;
}

exports.calculateNewIndex = function (data, index, result) {
    if (data.a == '<') {
        index = index - 1
        if (index < 0) 
            index = result.length - 1
    } else if (data.a == '>') {
        index = index + 1

        if (index > result.length - 1) 
            index = 0
    }

    return index;
}
