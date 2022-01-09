function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
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

define("vocabulary", vocabulary);
