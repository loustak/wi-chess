const Chess = require('chess.js').Chess

var game = new Chess()
var res = game.move('d4')

console.log(res)