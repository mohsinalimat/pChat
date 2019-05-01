const server = require('http').createServer()
const io = require('socket.io')(server)
const fs = require('fs')
const crypto = require('crypto')

userList = [] //Lista de nicknames conectados
users = {} //Diccionario por key(user.id) conectados
files = {} //Diccionario para almacenar las ids de los archivos junto al nombre del archivo

function Image(username, userColor, b64Image){
  this.username = username
  this.userColor = userColor
  this.b64Image = b64Image
}

function Message(username, userColor, usernameId, content, hash){
  this.username = username
  this.userColor = userColor
  this.usernameId = usernameId
  this.content = content
  this.hash = hash
}

function FileResponse(username, userColor, filename, hash, size){
  this.username = username
  this.userColor = userColor
  this.filename = filename
  this.hash = hash
  this.size = size
}

function File(filename, buffer, extension){
  this.filename = filename
  this.buffer = buffer
  this.extension = extension
}

function sha1(string) {
  return crypto.createHash('sha1').update(string, 'binary').digest('hex')
}

io.on('connection', function(client) {
  console.log('User connected (' + client.id + ')')
  client.on('checkUsername', function(username){
    var filtered = userList.filter(function(el){
      return el.username === username //Devuelve el objeto que coincida
    })

    if(filtered.length == 0){
      io.to(client.id).emit('checkUserResponse', false)
    }else{
      io.to(client.id).emit('checkUserResponse', true)
    }
  })

  client.on('newUsername', function(username){
    users[client.id] = {'username': username}
    userList.push({'id': client.id,'username': username, 'time': new Date()})
    io.emit('userConnected', username)
    io.emit('getUsersResponse', userList)
  })

  client.on('message', function(message){
    var messageHash = sha1(new Date().getTime() + users[client.id]['username'])
    io.emit('messageResponse', new Message(users[client.id]['username'], message.color, client.id, message.content, messageHash))
  })

  client.on('image', function(image){
    io.emit('imageResponse', new Image(users[client.id]['username'], image.color, image))
  })

  client.on('file', function(file){
    var fileHash = sha1(new Date().getTime() + file.name)
    var extension = file.name.split('.')[1]
    files[fileHash] = {'name': file.name, 'userId': client.id, 'extension': extension}

    if (!fs.existsSync('./uploads/')){
      fs.mkdirSync('./uploads/')
    }

    fs.writeFile('./uploads/' + fileHash + '.' + extension, file.buffer, function(err){
      if(err){
        console.log(err)
      }else{
        io.emit('fileResponse', new FileResponse(users[client.id]['username'], file.color, file.name, fileHash, file.size))
      }
    })
  })

  client.on('downloadFile', function(data){
    fs.readFile('./uploads/' + data.hash + '.' + files[data.hash].extension, function(err, buffer){
      if(err){
        console.log(err)
      }else{
        io.to(client.id).emit('downloadResponse', new File(files[data.hash].name, buffer, files[data.hash].extension))
      }
    })
  })

  client.on('getUsers', function(){
    io.emit('getUsersResponse', userList)
  })

  client.on('removeMessage', function(messageId){
    io.emit('removeMessageResponse', messageId)
  })

  client.on('editMessage', function(data){
    io.emit('editMessageResponse', data)
  })

  client.on('updateColor', function(data){
    io.emit('updateColorResponse', data)
  })

  client.on('disconnect', function() {
    console.log('Client disconnected: ', client.id)
    try{
      io.emit('userDisconnected', users[client.id]['username'])
      var filtered = userList.filter(function(el){
        return el.id === client.id //Devuelve el objeto que coincida
      })
      userList.splice(userList.indexOf(filtered[0]), 1)
      delete users[client.id]
      io.emit('getUsersResponse', userList)
    }catch{}
  })

  client.on('error', function (err) {
    console.log('Error from client => ', client.id)
    console.log(err)
  })
})

server.listen(1234, function (err) {
  if (err) throw err
  console.log('Starting server...')
  console.log('Server info => http://0.0.0.0:1234/')
})
