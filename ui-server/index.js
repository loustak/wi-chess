const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const bodyParser = require('body-parser')

const port = 3000

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

io.on('connection', (socket) => {
})

app.use(express.static('public'))

app.post('/start', (req, res) => {
  io.emit('start')

  res.status(200).end()
})

app.post('/fen', (req, res) => {
  const fen = req.body.fen
  io.emit('fen', fen)

  res.status(200).end()
})

server.listen(port, () => console.log(`Example app listening on port ${port}!`))