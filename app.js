var addresses = []
var archives = []
var newusers = []
var users = []
var lastMessages = {}
var admin = false

let setup = async function() {
  let me = new DatArchive(window.location.host)
  myinfo = await me.getInfo();
  console.log(myinfo.isOwner);
  if( myinfo.isOwner) {
    admin = true;
    console.log("hello admin.")
  }

  setTimeout(async function() {
    addressesJson = await me.readFile('addresses.json') 
    setupPartTwo(addressesJson)
    //checkForNewUsers()
  }, 1000)

  $('#refresh-joiners').on("click", function(){
    checkForNewUsers();
  });

  $('#register').on("click", function(){
    createNewClient();
  })


}

let setupPartTwo = async function(addressesJson) {
  addresses = JSON.parse(addressesJson) 
  addresses.push(window.location.host)

  for (let address of addresses) {
    lastMessages[address] = ''
    archives[address] = new DatArchive(address)
  }

  messageForm.addEventListener('submit', async function(event) {
    event.preventDefault()
    let newMessage = event.target.elements.message.value
    event.target.elements.message.value = ''  //reset the message input

    var time = new Date();
    var timestamp = time.toISOString();

    newMessage = timestamp + '|' + newMessage;

    await archives[window.location.host].writeFile('message.txt', newMessage)
    await archives[window.location.host].commit()
  })

  subscribeForm.addEventListener('submit', async function(event) {
    event.preventDefault()
    let newAddress = event.target.elements.address.value
    event.target.elements.address.value = ''
    addresses.push(newAddress)
    await archives[window.location.host].writeFile('addresses.json', JSON.stringify(addresses))
    await archives[window.location.host].commit()
    window.location.reload()
  })

}

var addNewUser = async function(button) {
  var record_to_update = $(button).data();
  console.log(record_to_update);
  console.log(record_to_update.id);
  var client_dat = $(button).attr('data-dat');

  //axios.PUT () ... on success:

  var airtable_update_endpoint = "https://api.airtable.com/v0/app0JcsJVfrS0esDy/chatroom0/" + record_to_update.id + "?api_key=keymEvEZKtuDcxhnV";

  //this adds it to the DAT, but need to only do this if successfully update airbase record
  console.log("adding new user @ " + client_dat);
  let newAddress = client_dat;
  
  axios({
    method:'patch',
    url: airtable_update_endpoint,
    responseType:'json',
    data: {
      "fields": {
        "IsAdded" : 1
      }
    }
  })
    .then(function(response) {
      console.log(response);
      //response.data
      if(response.data.fields.IsAdded == 1) {
        console.log("We've updated it!");
        updateArchive(newAddress);
      }
  });

}
var updateArchive = async function(client_dat){
  addresses.push(client_dat)
  await archives[window.location.host].writeFile('addresses.json', JSON.stringify(addresses)); //makes it readable?
  await archives[window.location.host].commit() //saves permanently / post reload
}

var updateUserList = function(){
  //console.log(users);
  for(let user of users) {
    if ($('#users').has('[data-user="'+ user +'"]').length == 0 ){
      $('#users').append('<div data-user="' + user + '">' + user + '</div>');
    }
  }
  console.log('** updated list of users, fetched latest messages **');
  
}
var updateRequestList = function(){
  console.log(newusers);
  for(let element of newusers) {
    if ($('#chatrequests').has('[data-user="'+ element.fields["Username"] +'"]').length == 0 ){
      $('#chatrequests').append('<p data-user="' + element.fields["Username"] + '">' + element.fields["Username"] + ' wants to join chat from: <span>' + element.fields["Origin Dat"] + '</span></p>');
      $('#chatrequests').append('<button data-dat="' + element.fields["Origin Dat"] + '" onclick="addNewUser(this);"> ADD ' + element.fields["Username"] + '</button>');
      $('button[data-dat="' + element.fields["Origin Dat"] + '"]').data(element);
    }
  }
}

var appendNewMessage = function(message) {
  let newMessageEl = document.createElement('div')
  newMessageEl.innerHTML = message 
  window.messages.appendChild(newMessageEl)
}

let fetchMessages = async function() {
  for (let address of addresses) {
    let message = await archives[address].readFile('message.txt')
    let nick = await archives[address].readFile('nick.txt')
    
    if(!users.includes(nick)){
      users.push(nick);
    }

    if (lastMessages[address] !== message) {

      message_text = message.split('|');
      message_text = message_text[1];
      console.log(message_text);
      appendNewMessage(`${nick} (${address.substr(0,5)}): ${message_text}`)
      lastMessages[address] = message
    }
  }
  updateUserList();
}

var checkForNewUsers = async function(){

  console.log("Checking for new users");

  //after you check all the current users for new messages, check for new user requests
  //todo - namable chat rooms that pull only for current rooms
  var airtable_read_endpoint = "https://api.airtable.com/v0/app0JcsJVfrS0esDy/chatroom0?maxRecords=3&view=Grid%20view&api_key=keymEvEZKtuDcxhnV";
  var airtable_write_endpoint = "https://api.airtable.com/v0/app0JcsJVfrS0esDy/chatroom0?api_key=keymEvEZKtuDcxhnV";

  
  axios
    .get(airtable_read_endpoint)
    .then(function(result) {
      console.log("Got data (showing first record): ", result.data.records[0]);
      result.data.records.forEach(function(element, index) {
        if(element.fields["IsAdded"] == 0 ) {
          console.log("found a waiting request -");
          if(element.fields["Target Dat"] == window.location.host){

            console.log("it's for us!");

            if(!newusers.includes(element)){
              newusers.push(element);
            }

            //console.log(element.fields["Username"]); //- don't care, will get from user
            //console.log(element.fields["Origin Dat"]);

            
            //send request to note user is being added

            //addNewUser(element.fields["Origin Dat"]); //- working, adds new user to be watched permanently

            //then POST to airtables, to set IsAdded from 0 to 1

            //await archives[window.location.host].writeFile('addresses.json', JSON.stringify(addresses));
            //await archives[window.location.host].commit();

            //window.location.reload();
            
          }
          
        }
        
        
      });
      updateRequestList();
      //now, if new - add to addresses (if admin)

    }); 
}

var createNewClient = async function() {
  //validation - check username is acceptable
  

  if($('#username').val() != "") {
    user = $('#username').val();

    alert('joining chat room as: ' + user);

    alert('you will be able to participate when the admin approves your request.');

    alert('joining chat room at: ' + window.location.host );


  } else {
    alert('please select a username!');
    return 0;
  }

try {

    // create a new Dat archive
    const chatclient = await DatArchive.create();
    var chatclientinfo = await chatclient.getInfo();
    var new_client_dat = chatclientinfo.url;
    console.log(new_client_dat);

    alert('your new chat client url is :' + new_client_dat);

    // send ajax request, create new record in airbase table, for this chatname, and new username

    var airtable_update_endpoint = "https://api.airtable.com/v0/app0JcsJVfrS0esDy/chatroom0?api_key=keymEvEZKtuDcxhnV";

    axios({
      method:'post',
      url: airtable_update_endpoint,
      responseType:'json',
      data: {
        "fields": {
          "Username" : user,
          "Target Dat" : window.location.host,
          "Origin Dat" : new_client_dat,
          "IsAdded" : 0
        }
      }
    })
      .then(function(response) {
        console.log(response);
        //response.data
        if(response.data.fields.IsAdded == 0) {
          alert("successfully requested to join chat, creating chat client..");
          console.log("join request success, new dat ready to be populated and navigated");
        }

    });
  } catch (err) {
    alert('<p>Something went wrong.</p>');
  }

    console.log('building new client');

      // try {
        await chatclient.writeFile('nick.txt', user);
        console.log(rv);
        await chatclient.writeFile('message.txt', user + ' joined.');
        const file = await me.readFile('index.html');
        await chatclient.writeFile('index.html', file);
        file = await me.readFile('app.js');
        await chatclient.writeFile('app.js', file);
        file = await me.readFile('addresses.json');
        await chatclient.writeFile('addresses.json', file);
        alert("done - navigating to new chat client");
      // } catch (err) {
      //   alert('failed to build new client');
      //   console.log(err);
      // }
  

  // if success, then create new client dat, which watches all current addresses, and polls this dat for new ones to add
}

setTimeout(() => {
  setInterval(fetchMessages, 500)
},2000)
