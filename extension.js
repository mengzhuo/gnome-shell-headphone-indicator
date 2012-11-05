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

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Jack = Extension.imports.jack;
const DBusIface = Extension.imports.dbus;
const Util = Extension.imports.util;

const Gettext = imports.gettext.domain('headphone-indicator');
const _ = Gettext.gettext;
const BLACK_LIST_KEY_NAME = 'blacklist';
const Status = {
    NONEXIST: 0,
    IN: 1,
    OUT: 2,
    UNKNOWN: 3
};

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
    
})

const Indicator = new Lang.Class({
    
    Name: 'HeadPhoneIndicator',
    
    Extends: PanelMenu.Button,
    
    _init : function(){
    
        this.parent(St.Align.START);
        
        this._jack = new Jack.HeadPhoneJack();
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
        
        this._settings = this._jack._settings;
        this.blackList = this._jack.blackList;
        
        this.actor.hide();
        
        if (this._jack.status != Status.NONEXIST){// We have sound card!
            //connect to change
            this._jack.connect('status-changed',Lang.bind(this,this._statusChanged));
            
            this.jackList = this._jack._jackNumIDList;
  
            //icon stuff
            let iconTheme = Gtk.IconTheme.get_default();
            
            if (!iconTheme.has_icon('headphone-indicator'))
                iconTheme.append_search_path ('%s/icons'.format(Extension.dir.get_path()) );
                        
            this._icon = new St.Icon({ style_class: 'popup-menu-icon',
                                        icon_name: 'headphone-indicator',
                                        });
            
            this.actor.add_actor(this._icon);
            
            if (this._jack.status == Status.IN){
            
                this.actor.show();
            }

            this._controlFlag = false;
            this._needUpdateMenu = [];
            this._addMenu();
            this.updateMenu();
            this.connect('destroy', Lang.bind(this, this._onDestroy));
        } else {
            global.log('Sound card detection error')
        }
    },
    
    // TODO: move to proper place
    _isInstance: function(busName) {
        // MPRIS instances are in the form
        // org.mpris.MediaPlayer2.name.instanceXXXX
        return busName.split('.').length > 4;
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
    
    _statusChanged : function (){
        
        if (this._jack.status == Status.IN){
            this.actor.show();
            for (let owner in this._players) {
                if (this._players[owner].player.status == 'Paused' && this._controlFlag)
                    this._players[owner].player.play();
            }
            
        } else {
        
            this.actor.hide();
            for (let owner in this._players) {
                if (this._players[owner].player.status == 'Playing'){
                    this._players[owner].player.pause();
                    this._controlFlag = true;
                }
            }

        }
        this.updateMenu();
        return true;
    },
    updateMenu : function (){
        for (let i in this._needUpdateMenu){
            if (this._needUpdateMenu[i].id == this._jack.id){
                this._needUpdateMenu[i].actor.add_style_class_name('plugged');
            } else {
                this._needUpdateMenu[i].actor.remove_style_class_name('plugged');
            }
        }
    },
    _addMenu : function (){
        
        let item = new PopupMenu.PopupMenuItem(_("Monitored Headphone Jack"), { reactive: false });
        this.menu.addMenuItem(item);
        
        for (let i in this.jackList){
            let flag = (this.blackList.indexOf( this.jackList[i].id ) == -1)?true:false;
            let _switch = new PopupMenu.PopupSwitchMenuItem('%s : %s'.format(
                                                   this.jackList[i].id,
                                                   this.jackList[i].description),flag);
            _switch.id = this.jackList[i].id;
            
            _switch.connect('toggled', Lang.bind(this, function(item) {
                
                this.blackList = this._settings.get_strv(BLACK_LIST_KEY_NAME);
                
                if (item.state && this.blackList.indexOf(item.id) > -1){
                    this.blackList.splice(this.blackList.indexOf(item.id),1);
                } else if (!item.state && this.blackList.indexOf(item.id) == -1){
                    this.blackList.push(item.id);
                }
                
                this._settings.set_strv(BLACK_LIST_KEY_NAME,this.blackList);
            }));
            this._needUpdateMenu.push(_switch);
            this.menu.addMenuItem(_switch);
        }
    },
    destroy : function () {
        this._onDestroy();
    },
    _onDestroy: function() {
        this.actor.hide();
        this._jack.destroy();
        this.actor.destroy();
        delete Main.panel.statusArea.HeadPhoneIndicator
    }
});

function enable() {
    if (typeof Main.panel.statusArea.HeadPhoneIndicator == 'undefined') {
        let indicator = new Indicator();
        Main.panel.addToStatusArea('HeadPhoneIndicator', indicator, 1, 'right');
    }
}

function disable() {
    if (typeof Main.panel.statusArea.HeadPhoneIndicator != 'undefined') {
        Main.panel.statusArea.HeadPhoneIndicator.destroy();
    }
}
function init(metadata) {
    Util.initTranslations('headphone-indicator');
}
