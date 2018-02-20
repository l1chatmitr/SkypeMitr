var uuidv4 = require('uuid/v4');
var uuidv5 = require('uuid/v5');
function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true,
        writable:     false,
        configurable: false
    });
}

define("MY_NAMESPACE", uuidv4());
//define("UUIDV5", require('uuid/v5'));