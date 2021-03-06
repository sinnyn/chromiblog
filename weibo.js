/**
 * @author Sinnyn
 * @Known Issue
 * 1. When no wid found, the arthurize method cannot submit a form
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
	var weibo = {
		TIMELINE_URL : 'https://api.weibo.com/2/statuses/home_timeline.json',
		REPOST_TIMELINE_URL : 'https://api.weibo.com/2/statuses/repost_timeline.json',
		COMMENTS_SHOW_URL : 'https://api.weibo.com/2/comments/show.json'
	};
	if (window.WB == undefined) {
		window.WB = weibo;
	} else {
		return;
	}
	$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
		var errorMsg = JSON.parse(jqXHR.responseText);
		switch (errorMsg.error_code) {
			case 21327:
			case 21332:
				//Regain access token
				localStorage.removeItem('wb_uid');
				localStorage.removeItem('wb_accessToken');
				WBOAUTH2.authorize();
				break;
			default:
				break;

		}
	});
	weibo.readTimeline = function(first, maxId) {
		var accessToken = localStorage["wb_accessToken"];
		var sinceId = localStorage['wb_sinceId'];
		var paramObj = {access_token: accessToken, count: 10};
		if (sinceId != 0 && !first) {
			paramObj.since_id = sinceId;
		}
		$.get(weibo.TIMELINE_URL, paramObj,function(data) {
				if (!data.statuses) {
					return;
				}
				if (data.statuses.length>0) {
					localStorage['wb_sinceId'] = data.statuses[0].mid;
				}
				var html = $(itemTemplate(data)).each(function(i, domEle) {
					if (domEle.nodeType == 'Text') {
						return;
					}
					var parentObj = this;
					$(domEle).find('img').load(function() {
						weibo.resizeColumn(parseInt($(domEle).attr('column')));
					});
					$(domEle).find('.interaction').mouseenter(function() {
						$(parentObj).find('.info').show();
					}).mouseleave(function() {
						$(parentObj).find('.info').hide();
					});
					$(domEle).find('.forward').click(function() {
						$.get(weibo.REPOST_TIMELINE_URL, {
							access_token: accessToken,
							id: $(parentObj).attr('mid')},
							function(data){
								weibo.handleReposts(data, parentObj);
							});
					});
					$(domEle).find('.comment').click(function() {
						$.get(weibo.COMMENTS_SHOW_URL, {
							access_token: accessToken,
							id: $(parentObj).attr('mid')},
							function(data){
								weibo.handleComments(data, parentObj);
							});
					});					
				});
				if (maxId != undefined) {
					html.appendTo('#items');
				} else {
					html.prependTo('#items');
				}
				weibo.resize();
		});
	};

	weibo.handleReposts = function(data, ele) {
		//$('#forwardTemplate').tmpl(data.reposts).appendTo($(ele).find('.reposts'));
	};

	weibo.handleComments = function(data, ele) {
		//$('#commentTemplate').tmpl(data.comments).appendTo($(ele).find('.comments'));
	};

	Handlebars.registerHelper('formatText', function(text) {
		text = text.replace(/(http:[^\s；：“”‘’\\:;]*)/g, '<a href="$1">$1</a>');
		text = text.replace(/@([^\s；：“”‘’\\:;]+)/g, '<a href="http://weibo.cn/n/$1">@$1</a>');
		text = text.replace(/#([^\s；：“”‘’\\:;]+)#/g, '<a href="http://s.weibo.cn/weibo/$1">#$1#</a>')
		return new Handlebars.SafeString(text);
	});

	Handlebars.registerHelper('formatDateText', function(text) {
		var date = new Date(text);
		return date.getFullYear() + "年" + date.getMonth() + "月" + date.getDate() + "日" + date.toLocaleTimeString();
	});

	Handlebars.registerHelper('safeText', function(text) {
		return new Handlebars.SafeString(text);
	});

	var LINE_COUNT = 5;
	var BLOCK_WIDTH = 237;
	weibo.resize = function() {
		var itemList = $('.item');
		for (var i = 0; i < itemList.length; i++) {
			var nextTop = i < LINE_COUNT ? 0 : 
				$(itemList[i - LINE_COUNT]).offset().top + $(itemList[i - LINE_COUNT]).height() + 30;
			var leftCount = i % LINE_COUNT;
			$(itemList[i]).attr('column', leftCount);
			$(itemList[i]).css({top: nextTop, left: leftCount * BLOCK_WIDTH});
		}
	};
	weibo.resizeColumn = function(index) {
		var itemList = $('.item');
		for (var i = index; i < itemList.length; i += LINE_COUNT) {
			var nextTop = i < LINE_COUNT ? 0 :
				$(itemList[i - LINE_COUNT]).offset().top + $(itemList[i - LINE_COUNT]).height() + 30;
			$(itemList[i]).css('top', nextTop);
		}
	};
})();

$(document).ready(function() {
	localStorage['wb_sinceId'] = 0;
	if (localStorage['wb_uid'])	{
		//window.setTimeout(readTimeline, 1000);
		WB.readTimeline(true);
		setInterval(WB.readTimeline, 30000);
	} else {
		if (WBOAUTH2.getURLParameter('access_token')) {
			WBOAUTH2.getAccessToken();
			WB.readTimeline(true);
		} else {
			WBOAUTH2.authorize();
		}
	}
});
