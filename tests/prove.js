
let msg = { m : 'h=cat|S|1,c=2821834921,d=4324832'}

exports.fromMsgToJson = function (msgJson) {
    

    var campiJson = msgJson.m.split(',');
    let jsonParsed = {}
    for (let campo of campiJson) {
        let key = campo.split('=')[0];
        let values = campo.split('=')[1].split('|');
        if (key == 'h') {
            jsonParsed["h"] = values
        }
        else if (key == 'c') { // chat id
            jsonParsed["c"] = Number(values[0])
        }
        else if (key == 'd') { // chat id
            jsonParsed["d"] = Number(values[0])
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
            for (let value of msgJson[key]) {
                text += value + '|' 
            }
            text = text.substring(0, text.length - 1);
            text += ','
        } else {
            text += msgJson[key] + ','
        }
    }
    text = text.substring(0, text.length - 1);
    stringToReturn['m'] = text;
    
    return stringToReturn;
}

console.log(this.fromMsgToJson(msg))
console.log(this.fromJsonToMsg(this.fromMsgToJson(msg)))