function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}


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
    }, "V": {
        "insert": "INSERT INTO Reviews (idTisana, nameUser, review, date) " +
                "VALUES (?, ?, ?, ?);",
        "mean": "SELECT avg(review) as mean, count(*) as count FROM Tisane.Reviews where idTisana = ?"
    }
}

define("queries", queries);
