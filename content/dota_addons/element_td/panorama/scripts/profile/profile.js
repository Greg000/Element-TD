"use strict";

var statsURL = 'http://hatinacat.com/leaderboard/data_request.php?req=stats&id='
var friendsURL = 'http://hatinacat.com/leaderboard/data_request.php?req=friends&id='
var ranksURL = 'http://hatinacat.com/leaderboard/data_request.php?req=player&ids='
var friendsPanel = $("#FriendsContainer")
var friendsLoaded = false;
var friendsRank = 0

function GetStats(steamID32) {
    $.Msg("Getting stats data for "+steamID32+"...")

    $.AsyncWebRequest( statsURL+steamID32, { type: 'GET', 
        success: function( data ) {
            var info = JSON.parse(data);
            var player_info = info["player"]

            var allTime = player_info["allTime"]
            if (allTime === undefined)
                return

            $("#GamesWon").text = allTime["gamesWon"]
            $("#BestScore").text = GameUI.FormatScore(allTime["bestScore"])

            // General
            $("#kills").text = GameUI.FormatKills(allTime["kills"])
            $("#frogKills").text = GameUI.FormatKills(allTime["frogKills"])
            $("#networth").text = GameUI.FormatGold(allTime["networth"])
            $("#interestGold").text = GameUI.FormatGold(allTime["interestGold"])
            $("#cleanWaves").text = allTime["cleanWaves"]
            $("#under30").text = allTime["under30"]

            // GameMode
            $.Msg(allTime)
            MakeBars(allTime, ["normal","hard","veryhard","insane"])
            MakeBoolBar(allTime, "order_chaos")
            MakeBoolBar(allTime, "horde_endless")
            MakeBoolBar(allTime, "express")

            var random = allTime["random"]
            var gamesPlayed = allTime["gamesPlayed"]
            $("#random").text = random+" ("+(random/gamesPlayed*100).toFixed(0)+"%)"
            //$("#gamesPlayed").text = gamesPlayed

            // Towers
            $("#towers").text = allTime["towers"] || 0
            $("#towersSold").text = allTime["towersSold"] || 0
            
            // Element Usage
            var light = allTime["light"]
            var dark = allTime["dark"]
            var water = allTime["water"]
            var fire = allTime["fire"]
            var nature = allTime["nature"]
            var earth = allTime["earth"]
            var total_elem = light+dark+water+fire+nature+earth
            var favorite = allTime["favouriteElement"]

            var nextStart = 0
            nextStart = RadialStyle("light", nextStart, light/total_elem)
            nextStart = RadialStyle("dark", nextStart, dark/total_elem)
            nextStart = RadialStyle("water", nextStart, water/total_elem)
            nextStart = RadialStyle("fire", nextStart, fire/total_elem)
            nextStart = RadialStyle("nature", nextStart, nature/total_elem)
            nextStart = RadialStyle("earth", nextStart, earth/total_elem)


            $("#"+favorite+"_usage").GetParent().AddClass("MostUsed")
        }
    })

    GetRank(steamID32, 0, "ClassicRank")
    GetRank(steamID32, 1, "ExpressRank")
    //GetRank(steamID32, 2, "FrogsRank") // Classic Rank request
}

function MakeBoolBar(data, name) {
    var panel = $("#"+name)
    var not_panel = $("#not_"+name)

    var total = data["gamesPlayed"]
    var numValue = data[name] || 0
    var value = numValue / total * 100
    var not_value = 100 - value

    $.Msg(name+": ",value.toFixed(1), "%")

    panel.style['width'] = value+"%;"
    not_panel.text = numValue//value.toFixed(0)+"%"
}

// This requires that every entry on arrayNames has a panel bar with the same ID name
function MakeBars (data, arrayNames) {
    // Count total and setup widths
    var total = 0
    var list = {}
    for (var i = 0; i < arrayNames.length; i++) {
        var value = data[arrayNames[i]]
        if (value)
        {
            list[arrayNames[i]] = value
            total+=value
        }
    };

    // Sort by values and set bars
    var remaining = 100
    bySortedValue(list, function(key, value) {
        remaining -= BarStyle(key, value, total, remaining)
    });
}

function bySortedValue(obj, callback, context) {
    var tuples = [];

    for (var key in obj) tuples.push([key, obj[key]]);

    tuples.sort(function(a, b) { return a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0 });

    var length = tuples.length;
    while (length--) callback.call(context, tuples[length][0], tuples[length][1]);
}

function BarStyle(panelName, cant, total, remaining) {
    var percent = (cant/total*100)
    var minWidth = cant.toString().length * 5
    var panel = $("#"+panelName)
    panel.percent = percent

    if (percent < minWidth)
        percent = minWidth

    if (percent > remaining)
        percent = remaining

    panel.style['width'] = percent+"%;"
    panel.text = cant

    return percent
}

function HoverDiff (name) {
    var panel = $("#"+name)
    $.DispatchEvent("DOTAShowTitleTextTooltip", panel, "#difficulty_"+name, parseInt(panel.percent).toFixed(0)+"% games");
}

function RadialStyle (panelName, start, percent) {
    var angle = percent*360
    
    $("#"+panelName).style["clip"] = "radial( 50% 50%,"+start+"deg, "+angle+"deg );"
    $("#"+panelName+"_usage").text = (percent*100).toFixed(1)+"%"

    return start+angle
}

function GetRank (steamID32, leaderboard_type, panelName) {
    $.AsyncWebRequest( ranksURL+steamID32+"&lb="+leaderboard_type, { type: 'GET', 
        success: function( data ) {

            var info = JSON.parse(data);
            var players_info = info["players"]

            for (var i in players_info)
            {
                $("#"+panelName).text = GameUI.FormatRank(players_info[i].rank);
            }
        }
    })
}

function GetPlayerFriends(steamID64) {
    $.Msg("Getting friends data for "+steamID64+"...")

    var delay = 0
    var delay_per_panel = 0.1;

    $.AsyncWebRequest( friendsURL+steamID64, { type: 'GET', 
        success: function( data ) {
            friendsLoaded = true;
            var info = JSON.parse(data);
            var players_info = info["players"]
            
            // Sort by rank
            players_info.sort(function(a, b) {
                return parseInt(a.rank) - parseInt(b.rank);
            });

            for (var i in players_info)
            {
                var callback = function( data )
                {
                    return function(){ CreateFriendPanel(data) }
                }( players_info[i] );

                $.Schedule( delay, callback )
                delay += delay_per_panel;
            }
        }
    })
}

function CreateFriendPanel(data) {
    friendsRank++

    var steamID64 = GameUI.ConvertID64(data.steamID)
    var playerPanel = $.CreatePanel("Panel", friendsPanel, "Friend_"+steamID64)
    playerPanel.steamID = steamID64
    playerPanel.score = GameUI.FormatScore(data.score)
    playerPanel.friendRank = friendsRank
    playerPanel.rank = GameUI.FormatRank(data.rank)
    playerPanel.percentile = GameUI.FormatPercentile(data.percentile)
    playerPanel.BLoadLayout("file://{resources}/layout/custom_game/profile_friend.xml", false, false);

    var steamID = GameUI.GetLocalPlayerSteamID()
    if (steamID64 == steamID)
        playerPanel.AddClass("local")
}

function ToggleProfile() {
    $("#Profile").ToggleClass("Hide")
}

function MakeButtonVisible() {
    var bShowProfile = GameUI.PlayerHasProfile(Game.GetLocalPlayerID())
    $("#ProfileToggleContainer").SetHasClass("Hide", !bShowProfile)
}

function LoadLocalProfile() {
    var steamID64 = GameUI.GetLocalPlayerSteamID() //34961594
    var steamID32 = GameUI.ConvertID32(steamID64)
    $("#AvatarImageMini").steamid = steamID64
    $("#AvatarImageProfile").steamid = steamID64
    $("#UserNameProfile").steamid = steamID64

    GetStats(steamID32)
    GetPlayerFriends(steamID32)
}

(function () {
    $.Schedule(0.1, MakeButtonVisible)
    $.Schedule(0.1, LoadLocalProfile)
})();