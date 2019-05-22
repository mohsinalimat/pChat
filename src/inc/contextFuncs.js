const { clipboard } = require('electron')

module.exports = {
  separator: () => {},

  copyMessage: (clickedElement) => {
    if(window.getSelection().toString() != ''){
      clipboard.writeText(window.getSelection().toString())
    }else{
      clipboard.writeText(clickedElement.text())
    }
  },

  editMessage: (clickedElement) => {
    console.log('edit Message')
  },
  
  removeMessage: (clickedElement) => {
    var id = clickedElement.attr('id')
    var message = $('span[id="' + id + '"]')
    var content = $('span[id="' + id + '"]').text()
    var user_id = message.attr('user_id')
    var username = message.parent().prev().find('span.message-username').text()
    var time = message.parent().prev().find('span.message-time').text()
  
    new Message(id, user_id, username, time, vars.activeChannel, content).remove()
  },

  editChannel: (clickedElement) => {
    console.log('edit Channel')
  },

  removeChannel: (clickedElement) => {
    new Channel(clickedElement.text()).remove()
  }
}