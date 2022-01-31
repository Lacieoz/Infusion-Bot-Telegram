const dotenv = require('dotenv');
dotenv.config({ path: '../config/.env' });
const botgram = require("botgram")
const fs = require("fs")
const lib = require('./libs/lib');
const libUtils = require('./libs/libUtils');
const libVote = require('./libs/libVote');

const bot = botgram(process.env.BOT_ID)
var conInfo = {
  host: process.env.HOST,
  user: process.env.USER,
  port: process.env.PORT,
  password: process.env.PASSWORD,
  database: "Tisane"
};

console.log(process.env.HOST)

libUtils.writeLog("AVVIATO SERVER TISANE!")

bot.all(libUtils.middleware);

bot.command("start", "help", (msg, reply) =>{
    reply.photo(fs.createReadStream("../files/simo.png"))
    reply.text("BENVENUTI ALLA TISANERIA DI SIMONA!\nBuona bevuta :)\n" + 
             "/avvia_ricerca : Per iniziare la ricerca della tisana")
})

bot.command("avvia_ricerca", (msg, reply, next) => {
    // PASSO C.1.A
    lib.startSearch(conInfo, msg, reply, "C");   
})

bot.command("avvia_ricerca_marca", (msg, reply, next) => {
    // PASSO M.1.A
    lib.startSearch(conInfo, msg, reply, "M");   
})

bot.command("avvia_ricerca_principi_attivi", (msg, reply, next) => {
    // PASSO P.1.A
    lib.startSearch(conInfo, msg, reply, "P");   
})

bot.callback(async function (query, next) {

    var data = JSON.parse(query.data);

    libUtils.writeLog("Ricevuta callback : ")
    libUtils.writeLog(data)

    data = libUtils.fromMsgToJson(data)

    // first, get the reply queue
    var reply = bot.reply(query.message.chat);

    if (data.a != null && data.a == 'V0')
        libVote.askVote(conInfo, reply, data, query)
    else if (data.a != null && data.a[0] == 'V') {
        // if vote done from direct search of id
        if (data.id != null) 
            libVote.voteInfuseWithId(conInfo, reply, data, query)
        else
            libVote.voteInfuse(conInfo, reply, data, query)
    }
    else if (data.h.length > 0) {
        if (data.h.length == 1) { // PARAMETRO 1 : TIPOLOGIA DI RICERCA
            // PASSO X.1.B
            lib.restartSearch(conInfo, reply, data, query);
        }
        else if (data.h.length == 2) { // PARAMETRO 2 : BIO / NON BIO
            // PASSO X.2
            lib.askIfBio(conInfo, reply, data, query)
        } 
        else if (data.h.length == 3) { // PARAMETRO 3 : MOSTRARE PER PRIMA VOLTA
            // PASSO X.3.A
            lib.showTisaneGallery(conInfo, reply, data, query)
        }
        else if (data.h.length >= 4) { // PARAMETRO 4 : MOSTRARE DOPO LA PRIMA VOLTA
            // PASSO X.3.B
            lib.changeTisaneGallery(conInfo, reply, data, query)
        }
    }
  });

bot.text(true, function (msg, reply, next) {
    if (msg.text.substring(0, 1) == '/' && libUtils.isNumeric(msg.text.substring(1))) {
        let id = msg.text.substring(1)
        lib.searchById(conInfo, reply, id, msg.chat.id)
    }
    else if (libUtils.isNumeric(msg.text.replace(/\s/g, ''))) {
        if (fs.existsSync("../files/foto_tisane/" + msg.text + ".jpg")) {
            let id = msg.text
            lib.searchById(conInfo, reply, id, msg.chat.id)
        } else {
            reply.text("Image not found")
        }
    } else {
        lib.searchByIngredient(conInfo, reply, msg.text);
    }
})


bot.command((msg, reply) =>
    reply.text("Invalid command."))

