chrome.tabs.getSelected(null, function(tab) {
  //properties of tab object
  tabId = tab.id;
  tabUrl = tab.url;
  b64 = btoa(tab.url);
  console.log("*"+b64);
  chat = new Chat(b64, "");
  //chrome.extension.getBackgroundPage().alertMe("fromJS");
  //rest of the save functionality.
});




var Chat = function(room, username, avatar) {
	server = "http://getshoutbox.com";
	avatar = avatar || "user32.png";
	username = username || "";	
	that = this;    

    if (localStorage.getItem("username")) username = localStorage.getItem("username");
	this.myUser = {"username":username, "room":room, "avatar":avatar, "password":"", id: new Date().getTime()};
	

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
		

	this.stripHTML = function(html) {
		var div = document.createElement("div");
		div.innerHTML = html;
		return text = div.textContent || div.innerText || "";		
	}
	
	this.clearChat = function() {
		$("#shoutChat").html("");
	}
	
	this.refreshChat = function() {
		this.clearChat();
		var that = this;
		$.get("http://www.shoutbox.com/chat/getLastMessagesExtension.php",{url:that.myUser.room},function(data) {
			//console.log(data);
			var messages = JSON.parse(data);
			//console.log(messages.length);
			for (var i=messages.length-1;i>=0;i--) {
				var message = messages[i];
				that.receiveText(message.username , message.message, message.date,0,message.avatar,message.ip, message.id);
				
			}
		});		
	}
	
	
	this.getLastMessages = function() {
		var that = this;
		$.get("http://www.shoutbox.com/chat/getLastMessagesExtension.php",{url:that.myUser.room},function(data) {			
			var messages = JSON.parse(data);
			//console.log(messages.length);
			for (var i=messages.length-1;i>=0;i--) {
				var message = messages[i];
				that.receiveText(message.username , message.message, message.date,0,message.avatar,message.ip, message.id);				
			}
			if (that.myUser.username!="") that.welcome();	
		});
	}
	
    function keyPressedFunction(e){
        //console.log("keyPressed");
	  	if (!e) e = window.event;
		    var keyCode = e.keyCode || e.which;
    		if (keyCode == '13'){
	      	  this.sendText();
	    }		
    }   

    this.sendText = function() {	
        var texte = $('#shoutBoxInput').val();
		texte = this.stripHTML(texte);
        if (texte=="") return;
		// enter username
		if (this.changingUsername) {
			this.changingUsername = false;
			
			$("#shoutBoxInput").removeClass("adminShoutBoxInput");
			$('#shoutBoxInput').val("");			
			$('#shoutBoxInput').attr("placeholder", that.traductions.enterYourTextHere);
			this.myUser.username = texte;
			localStorage.setItem("username",this.myUser.username);
			return;
		}

		if (this.myUser.username=="") {
			this.myUser.username = texte;
			localStorage.setItem("username",this.myUser.username);
			$('#shoutBoxInput').val("");
			that.welcome();			
			//that.shoutboxSocket.emit('changeUser', that.myUser);
			chrome.extension.getBackgroundPage().chat.shoutboxSocket.emit('changeUser', that.myUser);

			return;
		}
        $('#shoutBoxInput').val("");
        //this.shoutboxSocket.emit("send", this.myUser, texte);
        chrome.extension.getBackgroundPage().chat.shoutboxSocket.emit('send', this.myUser, texte);
		   
    }

	this.welcome = function() {
		$('#shoutBoxInput').attr("placeholder", that.traductions.enterYourTextHere);
		localStorage.setItem("username", this.myUser.username);
		this.serverMessage(that.traductions.welcome.format(this.myUser.username));
		$("#shoutBoxInput").removeClass("shoutInputRed");
	}

	
	this.serverMessage = function(texte) {
		var content = "";
		$("#shoutChat").append(that.traductions.serverMessage.format(texte));
		$("#shoutChat").animate({ scrollTop: $("#shoutChat")[0].scrollHeight}, 1000);
	}

	this.test = function(txt) {

	}
	
    this.receiveText = function(username, message, date, scrollTimer, avatar, ip, id) {  
    	
		message = that.parseSmileys(message);
		if (avatar!="") avatar = that.traductions.imageAvatar.format(avatar);
		if (date!="") date="("+date+")";
		var text = that.traductions.receivedText.format(id, ip, avatar,date,username,message);
		//console.log(text);
		$("#shoutChat").animate({ scrollTop: $("#shoutChat")[0].scrollHeight}, scrollTimer);	
		$(text).hide().appendTo("#shoutChat").fadeIn(2000);   
    }
	
	this.addUser = function(user) {
		this.updateNumberUsersDisplay();
		var avatar = user.avatar;
		if (avatar!="") {
			avatar = that.traductions.imageAvatar.format(avatar);
		}
		var txt = that.traductions.addUser.format(user.id, user.id, avatar, user.username);
		//console.log(user);
		//console.log("shoutBoxUserList"+txt);
		$("#shoutBoxUserList").append(txt);
		
	}


	this.updateNumberUsersDisplay = function(number) {
		var text = that.traductions.userOnline.format(number.toString());
		if (number>1) text = that.traductions.usersOnline.format(number.toString());		
		$("#shoutBoxHeaderText").text(text);
	}

	this.usernameChanged = function(username) {
		this.myUser.username = username;
		that.serverMessage(that.traductions.usernameChanged);
		$("#shoutBoxAdminImage").toggle();
	}	
	
	
	this.sortUsers = function() {
		that.users.sort(function(user1, user2){
   		return user1.avatar < user2.avatar
		});
	};	

	$("#shoutBoxAdminImage").click(function(e) {
        e.stopImmediatePropagation();
		if (!$("#shoutBoxInput").hasClass("adminShoutBoxInput")) {
			$("#shoutBoxInput").val("");
			$("#shoutBoxInput").focus();
			$('#shoutBoxInput').attr("placeholder", that.traductions.changeYourUsername);
			$("#shoutBoxInput").addClass("adminShoutBoxInput");
			that.changingUsername = true;

		} else {
			$("#shoutBoxInput").removeClass("adminShoutBoxInput");
			$('#shoutBoxInput').val("");

			$('#shoutBoxInput').attr("placeholder", that.traductions.enterYourTextHere);			
		}
    });
	$("#shoutBoxHeader").click(function(e) {
		// get the list of users !
		if (chrome.extension.getBackgroundPage().chat) {
			that.getUsers(chrome.extension.getBackgroundPage().chat.users);		
		}
    	$("#shoutBoxUserList").toggle("fast");
		
	});
    document.getElementById('shoutBoxInput').addEventListener("keypress", keyPressedFunction.bind(this), false);


		
// scoekt stuff


	this.getLastMessages();
	this.users = [];
	if (chrome.extension.getBackgroundPage().chat) {
		this.updateNumberUsersDisplay(chrome.extension.getBackgroundPage().chat.users.length.toString());	
	}
	

	this.userChanged = function (user) {
		//addUser : "<div class='shoutBoxUserItem' data-id={0} id='shoutBoxUser{1}'>{2}{3}</div>",//1=imageAvatar
		var avatar = user.avatar;
		if (avatar!="") {
			avatar = that.traductions.imageAvatar.format(avatar);
		}		
		var txt = that.traductions.addUser.format(user.id, user.id, avatar, user.username);
		//console.log(txt);
		$("#shoutBoxUser"+user.id).html(txt);
	};


	
	this.addUser = function(user) {
		var avatar = user.avatar;
		if (avatar!="") {
			avatar = that.traductions.imageAvatar.format(avatar);
		}
		var txt = that.traductions.addUser.format(user.id, user.id, avatar, user.username);
		//console.log(user);
		//console.log("shoutBoxUserList"+txt);
		$("#shoutBoxUserList").append(txt);
		
	}
	

	this.getUsers = function(usersInRoom) {
		//console.log("usersInRoom="+usersInRoom+ "len=" + usersInRoom.length);
		that.users = usersInRoom;
		$("#shoutBoxUserList").html("");
		//that.sortUsers();
		for (var i=0;i<usersInRoom.length;i++) {
			that.addUser(usersInRoom[i]);	
		}		
	};
	
	
	this.removeUser = function(user) {
		var index = that.users.indexOf(user);
		that.users.splice(index, 1);
		that.updateNumberUsersDisplay();
		$("#shoutBoxUser"+user.id).remove();		
	};



	
	$(".shoutBoxContainer").on( "click", ".shoutBoxUserItem", function(e) {	
		e.stopImmediatePropagation();
		var userid = ($(e.currentTarget).data("id"));
		that.openPrivateChat(userid);
	});
	
	this.openPrivateChat = function(userid) {
		//$("body").append("<div class='privateChat'>zaza</div>");
	}
	
	

	
	
}