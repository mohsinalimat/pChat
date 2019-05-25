const fs = require('fs')
const config = JSON.parse(fs.readFileSync('settings.json', 'utf-8'))
const server = require('https').createServer({
  key: fs.readFileSync(config.certs.serverKey, 'utf-8'),
  cert: fs.readFileSync(config.certs.serverCert, 'utf-8')
})
const io = require('socket.io')(server)
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

mongoose.connect(config.dbURL, {useNewUrlParser: true}) 
mongoose.Promise = global.Promise
let db = mongoose.connection

db.on('error', () => {
  console.log('[ERROR] Cannot connect to MongoDB server')
})

let channelSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  position: Number,
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Messages'
  }]
})

let messagesSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  id: String,
  user_id: String,
  username: String,
  content: String,
  time: Number,
  channel: String,
  state: Object
})

let usersSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  user_id: String, 
  username: String,
  password: String,
  status: String,
  sessionHash: String
})

let Channel = mongoose.model('Channels', channelSchema)
let Message = mongoose.model('Messages', messagesSchema)
let User = mongoose.model('Users', usersSchema)

io.on('connection', (client) => {
  console.log('User connected (' + client.id + ')')

  client.on('loginRequest', (creds) => {
    User.findOne({username: creds.username}).exec((err, user) => {
      if(user != null){
        bcrypt.compare(creds.password, user.password).then((res) => {
          if(res){
            var sessionHash = crypto.createHash('sha1').update(Math.random().toString(36), 'binary').digest('hex')
            User.updateOne({username: creds.username}, {$set: {'sessionHash': sessionHash, 'user_id': client.id}, 'status': 'online'}).exec()
            io.to(client.id).emit('loginRequestResponse', {'status': 'ok', 'sessionHash': sessionHash})
          }else{
            io.to(client.id).emit('loginRequestResponse', {'status': 'err', message: 'La contrasseña no es correcta'})
          }
        })
      }else{
        io.to(client.id).emit('loginRequestResponse', {'status': 'err', message: 'El usuario no existe'})
      }
    })
  })

  client.on('getChannels', () => {
    Channel.find().populate('messages').exec((err, item) => {
      io.to(client.id).emit('setChannels', item)
    })
  })

  client.on('joinChannel', (channel) => {
    Object.keys(client.rooms).forEach((el) => {
      if(el != client.id){
        client.leave(el)
      }
    })
    client.join(channel.name)
  })

  client.on('getChannelMessages', (channel) => {
    Channel.findOne({name: channel}).populate('messages').exec((err, item) => {
      io.to(client.id).emit('getChannelMessagesResponse', item)
    })
  })

  client.on('message', (message) => {
    var msg = new Message({
      _id: new mongoose.mongo.ObjectId(),
      id: message.id,
      user_id: message.user_id,
      username: message.username,
      content: message.content,
      time: message.time,
      channel: message.channel,
      state: message.state
    })

    msg.save((err) => {
      if(err) return console.error(err)
    })

    Channel.updateOne({name: message.channel}, {$push: {messages: msg._id}}).exec()

    io.in(message.channel).emit('messageResponse', message)
  })

  client.on('removeMessage', (message) => {
    Message.deleteOne({id: message.id}).exec()

    io.emit('removeMessageResponse', message)
  })

  client.on('createChannel', (channel) => {
    Channel.findOne({name: channel.name}).exec((err, item) => {
      if(item == null){
        var chn = new Channel({
          _id: new mongoose.mongo.ObjectId(),
          name: channel.name,
          position: channel.position,
          messages: []
        })
    
        chn.save((err) => {
          if(err) return console.error(err)
        })
    
        io.emit('createChannelResponse', {'status': 'ok', 'data': channel})
      }else{
        io.emit('createChannelResponse', {'status': 'err', 'msg': 'El canal ya existe'})
      }
    })
  })

  client.on('removeChannel', (channel) => {
    Channel.deleteOne({name: channel.name}).exec()
    io.emit('removeChannelResponse', channel)
  })

  client.on('updateChannelIndex', (channels) => {
    channels.forEach(function(chn) {
      Channel.updateOne({name: chn.chnName}, {$set: {position: chn.pos}}).exec()
    })

    Channel.find().exec((err, item) => {
      io.emit('updateChannels', item)
    })
  })

  client.on('getUsersOnline', () => {
    User.find().exec((err, users) => {
      io.emit('getUsersOnlineResponse', users)
    })
  })

  client.on('disconnect', () => {
    User.updateOne({user_id: client.id}, {$set: {status: 'offline'}}).exec()
    console.log('Client disconnected: ', client.id)
  })

  client.on('error', (err) => {
    console.log('Error from client => ', client.id)
    console.log(err)
  })
})

server.listen(config.port, (err) => {
  if (err) throw err
  console.log('Starting server...\nServer info => https://0.0.0.0:' + config.port + '/')
})
