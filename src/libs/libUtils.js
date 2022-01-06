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



