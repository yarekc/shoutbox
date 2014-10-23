chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
    if (details.frameId==0) {
        startChat(details.url);      
    }
});


var chat;
chrome.tabs.onActivated.addListener(function(tabId,changeInfo,tab){ //onUpdated should fire when the selected tab is changed or a link is clicked 
    chrome.tabs.getSelected(null,function(tab){
        if (tab.url.indexOf("http") == -1) return;
        startChat(tab.url);
    });
});

function startChat(url) {
        b64 = btoa(url);
        if (chat) {
            chat.shoutboxSocket.socket.disconnect();
            chat = new Chat(b64, "");
        } else {
            chat = new Chat(b64, "");    
        }
}


var Chat = function(room, username, avatar) {
    this.users = [];
    
    server = "http://getshoutbox.com";
    avatar = avatar || "user32.png";
    username = username || "guest";  
    that = this;

    var colors = ['#FF0000','#CC0000','#AA0000','#880000','#440000','#000000','#440000','#880000','#AA0000','#CC0000','#FF0000'];
    var colorsIndex = 0;

    if (localStorage.getItem("username")) username = localStorage.getItem("username");
    this.myUser = {"username":username, "room":room, "avatar":avatar, "password":"", id: new Date().getTime()};
   // console.log("Starting chat:"+room+" username:"+username);    

    // template engine
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
        ;
      });
    };
    String.prototype.replaceAll = function(target, replacement) {
      return this.split(target).join(replacement);
    };
    
// traductions
    this.traductions = {
    welcome:"Welcome {0}",
    userOnline:"{0} user online",
    usersOnline:"{0} users online",
    enterYourTextHere : "Enter your text here",
    serverMessage: "<div class='shoutServerText'>{0}</div>",
    changeYourUsername:"Choose a new username",
    imageAvatar: "<img src='{0}' class='shoutBoxAvatar'>",
    usernameChanged:"UsernameChanged",
    mp3: "dink.mp3",
    addUser : "<div class='shoutBoxUserItem' data-id={0} id='shoutBoxUser{1}'>{2}{3}</div>",
    banText : "<button class='shoutboxBanBtn' alt='Ban all messages from this user' title='Ban all messages from this user'>Ban</button>",
    receivedText:"<div data-id={0} data-ip={1} class='shoutText'>{2}<span class='shoutDate'>{3} </span><span class='shoutUserText'>{4}</span>: {5}<button class='shoutboxBanBtn'>ban</button><button class='shoutboxDelBtn'>del</button></div>"
    
};
// smileys
    this.smileys = {
        "(angry)":"<img src='smileys/(angry).gif'>",
        "(lol)":"<img src='smileys/(lol).gif'>",
        "(angry)":"<img src='smileys/(angry).gif'>",
        "(love)":"<img src='smileys/(love).gif'>",
        "(sorry)":"<img src='smileys/(sorry).gif'>",
        "(why)":"<img src='smileys/(why).gif'>",
        ":D":"<img src='smileys/D).gif'>",
        ";(":"<img src='smileys/;(.gif'>",
        "(sorry)":"<img src='smileys/(sorry).gif'>",
        ";)":"<img src='smileys/(happy).gif'>",
        ":)":"<img src='smileys/(happy).gif'>"  
    }
    this.parseSmileys = function(text) {
        for (var symbol in this.smileys) {
            var image = this.smileys[symbol];
            text = text.replaceAll(symbol,image);
        }
        return text;
    }
        
    this.getChatWindow = function() {
        var popups = chrome.extension.getViews({type: "popup"});
        if (popups.length) {
            return popups[0];            
        } else {
            return false;
        }       
    }


    this.stripHTML = function(html) {
        var div = document.createElement("div");
        div.innerHTML = html;
        return text = div.textContent || div.innerText || "";       
    }
    
   
    this.updateNumberUsersDisplay = function() {
        //console.log("updateNumberUsersDisplay:"+that.users.length.toString());

        var text = "";
        var numberUsers = that.users.length-1;
        //console.log("updateNumberUsersDisplay:"+numberUsers);
        if (numberUsers>0) text = numberUsers.toString();

        chrome.browserAction.setBadgeText({
            text: text
        });
        if (that.getChatWindow()) {
            that.getChatWindow().chat.updateNumberUsersDisplay(that.users.length.toString());
        }    
    }

    this.addUser = function(user) {
        var avatar = user.avatar;
        if (avatar!="") {
            avatar = that.traductions.imageAvatar.format(avatar);
        }
        var txt = that.traductions.addUser.format(user.id, user.id, avatar, user.username);
        //console.log("addUser:"+txt);
        //console.log("shoutBoxUserList"+txt);
        that.updateNumberUsersDisplay();
    }
    

    

    this.shoutboxSocket = io.connect(server+":1444" , {'force new connection': true });
    //console.log("connecting to "+server);

    this.shoutboxSocket.on('connect', function(){
        //console.log("enterRoom:" + that.myUser.room);
        that.shoutboxSocket.emit('enterRoom', that.myUser);        
    });
    
    this.shoutboxSocket.on('del', function (id) {
        $('*[data-id='+id+']').remove();        
    });
    
    this.shoutboxSocket.on('ban', function (ip) {
        $('*[data-ip='+ip+']').remove();        
    }); 
        



    
    this.shoutboxSocket.on('receiveText', function (user, message, ip, id) {
        if (that.interval) clearInterval(that.interval);
        var snd = new Audio(that.traductions.mp3); 
        snd.play();

        that.interval = setInterval(function(){
            console.log("rotateIcon");
            if (colorsIndex>=colors.length-1) {
                colorsIndex = 0;
                clearInterval(that.interval);
                return;
            }

            colorsIndex++;
            chrome.browserAction.setBadgeBackgroundColor({
                color: colors[colorsIndex]
            })


        }, 100);
        
        if (that.getChatWindow()) {
            //console.log(user.username, message , "",200,user.avatar, ip, id);
            that.getChatWindow().chat.receiveText(user.username, message , "",200,user.avatar, ip, id);
            //that.getChatWindow().chat.test("hello world");

        }    
    });


    this.shoutboxSocket.on('userChanged', function (user) {
        //addUser : "<div class='shoutBoxUserItem' data-id={0} id='shoutBoxUser{1}'>{2}{3}</div>",//1=imageAvatar
        var avatar = user.avatar;
        if (avatar!="") {
            avatar = that.traductions.imageAvatar.format(avatar);
        }       
        var txt = that.traductions.addUser.format(user.id, user.id, avatar, user.username);
        //console.log(txt);
        
    }); 

    
    this.shoutboxSocket.on('error', function (errorMessage) {
        //console.log(errorMessage);
    });

    
    this.shoutboxSocket.on('addUser', function(user) {
        that.users.push(user);
        that.addUser(user);     
    });
    

    this.shoutboxSocket.on('getUsers', function(usersInRoom) {
        //console.log("usersInRoom="+usersInRoom+ "len=" + usersInRoom.length);
        that.users = usersInRoom;
        that.updateNumberUsersDisplay();
        //#that.sortUsers();
        for (var i=0;i<usersInRoom.length;i++) {
            that.addUser(usersInRoom[i]);   
        }
        
    });
    
    
    this.shoutboxSocket.on('removeUser', function(user) {
        var index = that.users.indexOf(user);
        that.users.splice(index, 1);
        that.updateNumberUsersDisplay();
        //#$("#shoutBoxUser"+user.id).remove();
        
    }); 

   

    
    
}

