// A headphone indicator for Gnome-shell
// Copyright (C) 2012 Meng Zhuo, Gnome-shell headphone Indicator extension contributors
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Part of the code(Dbus-control) from extension mediaplayer@patapon.info
const HEAD_PHONE_MONITOR_NAME = 'headphone-indicator';
const UNDEFINED = 'undefined';
const MINT_GREEN = '#7CD53A';
const ICON_COLOR_KEY = 'icon-color';
const COLOR_REGEX = /^#[\dA-Fa-f]{6}$/i;

const Main = imports.ui.main;
const St = imports.gi.St;
const Lang = imports.lang;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const DBusIface = Extension.imports.dbus;
const Util = Extension.imports.util;

const MusicPlayer = new Lang.Class({
    
    Name: "MusicPlayer",
    
    _init : function(busName, owner){

        this._owner = owner;
        this._busName = busName;
        this._mediaServerPlayer = new DBusIface.MediaServer2Player(busName);
    },
    
    get status(){
        return this._mediaServerPlayer.PlaybackStatus;
    },
    
    play : function(){
         this._mediaServerPlayer.PlayRemote();
    },
    
    pause : function(){ 
        this._mediaServerPlayer.PauseRemote();
    },
    toggle: function(){
        // we dont depend on remote Dbus system toggle, as it is not fully
        // controlled by us.
        if (this.status){
            this.pause();
        } else {
            this.play();
        }
    }
    
})

const HeadPhoneMonitor = new Lang.Class({
    
    Name: HEAD_PHONE_MONITOR_NAME,
    
    _init : function(){
    
        // append to volume
        this._delegate = Main.panel.statusArea.volume;
        this._control = this._delegate._control;
        Main.panel.statusArea.volume._monitor = this;

        // monitor headphone signal
        this._monitorSignalID = this._delegate._volumeMenu.connect('headphones-changed', 
                                            Lang.bind(this, 
                                                      this._statusChanged));
        this._iconColor = MINT_GREEN;

        // settings
        this._settings = Util.getSettings('org.gnome.shell.extensions.headphone-indicator');
        this._settingsSignalID = this._settings.connect('changed', Lang.bind(this, this._onSettingsChanged));
        this._onSettingsChanged();


        //shows we controlled this headphone
        this._delegate._headphoneIcon.set_style(
                            'color:%s'.format(this._iconColor));
        
        // anything playing
        this.playing = false;
        // players list
        this._players = {};
        // the DBus interface
        this._dbus = new DBusIface.DBus();
        // player DBus name pattern
        let name_regex = /^org\.mpris\.MediaPlayer2\./;
        // load players
        this._dbus.ListNamesRemote(Lang.bind(this,
            function(names) {
                for (n in names[0]) {
                    let name = names[0][n];
                    if (name_regex.test(name)) {
                        this._dbus.GetNameOwnerRemote(name, Lang.bind(this,
                            function(owner) {
                                this._addPlayer(name, owner);
                            }
                        ));
                    }
                }
            }
        ));
        // watch players
        this._dbus.connectSignal('NameOwnerChanged', Lang.bind(this,
            function(proxy, sender, [name, old_owner, new_owner]) {
                if (name_regex.test(name)) {
                    if (new_owner && !old_owner)
                        this._addPlayer(name, new_owner);
                    else if (old_owner && !new_owner)
                        this._removePlayer(name, old_owner);
                    else
                        this._changePlayerOwner(name, old_owner, new_owner);
                }
            }
        ));
    }, 
    _addPlayer: function(busName, owner) {

        if (this._players[owner]) {
            let prevName = this._players[owner]._busName;
            // HAVE:       ADDING:     ACTION:
            // master      master      reject, cannot happen
            // master      instance    upgrade to instance
            // instance    master      reject, duplicate
            // instance    instance    reject, cannot happen
            if (this._isInstance(busName) && !this._isInstance(prevName))
                this._players[owner]._busName = busName;
            else
                return;
        } else if (owner) {
            this._players[owner] = {player: new MusicPlayer(busName, owner)};
        }
    },

    _removePlayer: function(busName, owner) {
        if (this._players[owner]) {
            delete this._players[owner];
        }
    },
    _changePlayerOwner: function(busName, oldOwner, newOwner) {
        if (this._players[oldOwner]) {
            this._players[newOwner] = this._players[oldOwner];
            delete this._players[oldOwner];
        }
    },
    
    _statusChanged : function (menu, value){

        for(let owner in this._players){
            let player = this._players[owner].player
            //  
            //          OUT     IN
            //  Playing pause   skip
            //  Paused  skip    start
            //
            if (player.status == "Paused" && value){
                player.play();
            } else if (player.status == "Playing" && ! value){
                player.pause();
            }
        }
    },
    _onSettingsChanged : function(){
        icon_color = this._settings.get_string(ICON_COLOR_KEY);
        if (!COLOR_REGEX.test(icon_color)){
            global.log(icon_color);
            global.log(COLOR_REGEX.test(icon_color));
            this._settings.set_string(ICON_COLOR_KEY, MINT_GREEN);
        
        }
        this._iconColor = this._settings.get_string(ICON_COLOR_KEY);
        this._delegate._headphoneIcon.set_style(
                            'color:%s'.format(this._iconColor));
    
    },
    destroy : function () {
        this._onDestroy();
    },
    _onDestroy: function() {
        //
        this._delegate._headphoneIcon.set_style('color:');
        this._delegate._volumeMenu.disconnect(this._monitorSignalID);
    }
});

function enable() {
    if (typeof Main.panel.statusArea.volume != UNDEFINED) {
        let headPhoneMonitor = new HeadPhoneMonitor();
    }
}

function disable() {
    if (typeof Main.panel.statusArea.volume != UNDEFINED ) {
        try{
            headPhoneMonitor.destroy();
        } catch(e) {
            global.logError(e)
        }
    }
}
function init(metadata) {
    global.log("%s....[ OK ]".format(HEAD_PHONE_MONITOR_NAME));
}
