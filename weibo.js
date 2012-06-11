/**
 * @author Sinnyn
 */


(function(){
	var OAUTH2 = {};
	
	if (window.WBOAUTH2 == undefined) {
		window.WBOAUTH2 = OAUTH2;
	} else {
		return;
	}

	var callbackPage = "chrome-extension://pppmgddkkjodbmdcmbkejigljidgpalo/popup.html";
	var appKey = "2866263947";
	var appSecret = "8db1e4d3c4a2b9c9509a1174e3347911";
	var weibo_auth_url = "https://api.weibo.com/oauth2/authorize";
	var weibo_token_url = "https://api.weibo.com/oauth2/access_token";
	
	OAUTH2.authorize = function() {
		var form = $('<form>').attr({
			method: 'post',
			action: weibo_auth_url
		}).appendTo(document.body);
		$('<input>').attr({
			type: 'hidden',
			name: 'client_id',
			value: appKey
		}).appendTo(form);
		$('<input>').attr({
			type: 'hidden',
			name: 'redirect_uri',
			value: callbackPage
		}).appendTo(form);		
		$('<input>').attr({
			type: 'hidden',
			name: 'response_type',
			value: 'token'
		}).appendTo(form);		
		form.submit();
	};
	
	OAUTH2.getAccessToken = function() {
		var access_token = WBOAUTH2.getURLParameter('access_token');
		var user_id = WBOAUTH2.getURLParameter('uid');
		var expire = WBOAUTH2.getURLParameter('expires_in');
		localStorage['wb_uid'] = user_id;
		localStorage['wb_accessToken'] = access_token;
		localStorage['wb_sinceId'] = 0;
		//TODO expires
	};
	
	OAUTH2.getURLParameter = function(name) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\#&]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(window.location.href);
		if(results == null)
		  return "";
		else
		  return decodeURIComponent(results[1].replace(/\+/g, " "));
    };
	
})();

(function(){
	var weibo = {};
	if (window.WB == undefined) {
		window.WB = weibo;
	} else {
		return;
	}
	weibo.readTimeline = function(first) {
		var TIMELINEURL="https://api.weibo.com/2/statuses/home_timeline.json";
		var accessToken = localStorage["wb_accessToken"];
		var sinceId = localStorage['wb_sinceId'];
		var paramObj = {access_token: accessToken, count: 5};
		if (sinceId != 0 && !first) {
			paramObj.since_id = sinceId;
		}
		$.ajax({
			url:TIMELINEURL,
			data:paramObj,
			dataType: "json",
			success: function(data){
				if (data.statuses.length>0) {
					localStorage['wb_sinceId'] = data.statuses[0].mid;
				}
				$('#itemTemplate').tmpl(data.statuses).prependTo('#items').each(function(i){
					$(this).children('.interaction').children('.forward').click(function(){
						debugger;
					});
					$(this).children('.interaction').children('.comment').click(function(){
						debugger;
					});
				});
			},
			error: function(data){
				var errorMsg = JSON.parse(data.responseText);
				if (errorMsg.error_code == 21327) {
					//Regain access token
					localStorage.removeItem('wb_uid');
					localStorage.removeItem('wb_accessToken');
					WBOAUTH2.authorize();
				}
			}
			});
	};
	
	weibo.getText = function(text) {
		text = text.replace(/(http:[^\s；：“”‘’\\:;]*)/g, '<a href="$1">$1</a>');
		text = text.replace(/@([^\s；：“”‘’\\:;]+)/g, '<a href="http://weibo.cn/n/$1">@$1</a>');
		text = text.replace(/#([^\s；：“”‘’\\:;]+)#/g, '<a href="http://s.weibo.cn/weibo/$1">#$1#</a>')
		return text;
	};

})();

$(document).ready(function() {
	if (localStorage['wb_uid'])	{
		//window.setTimeout(readTimeline, 1000);
		WB.readTimeline(true);
		//setInterval(WB.readTimeline, 30000);
	} else {
		if (WBOAUTH2.getURLParameter('access_token')) {
			WBOAUTH2.getAccessToken();
		} else {
			WBOAUTH2.authorize();
		}
	}
});
