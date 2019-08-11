const $ = require('jquery')
var User = require('./user')
var vars = require('./vars')

module.exports = class Message{
  constructor(user, time, channel, content) {
    this._id = null
    var userObj = new User(user.username)
    userObj.user_id = user.user_id
    userObj.nickname = user.nickname
    userObj.color = user.color
    userObj.roles = user.roles
    this.user = userObj
    this.content = content
    this.time = time
    this.channel = channel
    this.image = null
    this.file = null
    this.state = {edited: false}
  }

  send(){
    vars.socket.emit('message', this)
  }

  remove(){
    vars.socket.emit('removeMessage', this)
  }

  edit(newContent){
    this.content = newContent
  }

  toHTML(){
    var datetime = new Date(this.time)
    var time = ('0' + datetime.getHours()).slice(-2) + ':' + ('0' + datetime.getMinutes()).slice(-2)

    this.content = this.content.replace(/\B\@([\w\-]+)/gim, function(match){
      return '<span class="mention">' + match + '</span>'
    })

    var container =  $('<div>').addClass('message-container')
    var header = $('<div>').addClass('message-header')
    var message = $('<div>').addClass('message')
    var line = $('<span>').addClass('message-line').html(this.content).attr({user_id: this.user.user_id, id: this._id, datetime: this.time})
    header.append($('<span>').addClass('message-username').attr({username: this.user.username}).text(this.user.nickname).css('color', this.user.color))
    header.append($('<span>').addClass('message-time').text(time))
    if(this.image != null){
      var image = $('<img>').attr({id: this._id, src: this.image}).addClass('imageMsg')
      var imageContainer = $('<span>').attr({user_id: this.user.user_id, id: this._id, datetime: this.time}).append(image)
      image.on('load', () => {
        funcs.scroll()
      })

      image.on('click', function(){
        funcs.showFullImage($(this).attr('src'))
      })

      message.append(imageContainer)
    }else{
      message.append(line)
    }
    container.append(header)
    container.append(message)

    return container
  }

  toAppend(){
    var toRet = null
    if(this.image != null){
      var image = $('<img>').attr({id: this._id, src: this.image}).addClass('imageMsg')
      var imageContainer = $('<span>').attr({user_id: this.user.user_id, id: this._id, datetime: this.time}).append(image)
      image.on('load', () => {
        funcs.scroll()
      })

      image.on('click', function(){
        funcs.showFullImage($(this).attr('src'))
      })

      toRet = imageContainer
    }else{
      this.content = this.content.replace(/\B\@([\w\-]+)/gim, function(match){
        return '<span class="mention">' + match + '</span>'
      })
      toRet = $('<span>').addClass('message-line').html(this.content).attr({user_id: this.user.user_id, id: this._id})
    }

    funcs.scroll()
    return toRet
  }

  get edited(){
    return state.edited
  }
}