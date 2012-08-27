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


const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Jack = Extension.imports.jack;
const DBusIFace = Extension.imports.dbus;
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

const Indicator = new Lang.Class({
    
    Name: 'HeadPhoneIndicator',
    
    Extends: PanelMenu.Button,
    
    _init : function()
    {
        this.parent(St.Align.START);
        
        this._jack = new Jack.HeadPhoneJack();
        
        this._settings = this._jack._settings;
        this.blackList = this._jack.blackList;
        
        this.actor.hide();
        
        if (this._jack.status != Status.NONEXIST){// We have sound card!
            //connect to change
            this._jack.connect('status-changed',Lang.bind(this,this._statusChanged));
            
            this.jackList = this._jack._jackNumIDList;
            
            //connect to dbus 
            this._player = new DBusIFace.Media2Server();
  
            //icon stuff
            let iconTheme = Gtk.IconTheme.get_default();
            
            if (!iconTheme.has_icon('headphone-indicator'))
                iconTheme.append_search_path (Extension.dir.get_path()+'/icons');
                        
            this._icon = new St.Icon({ icon_type: St.IconType.SYMBOLIC,
                                        style_class: 'popup-menu-icon',
                                        icon_name: 'headphone-indicator',
                                        });
            
            this.actor.add_actor(this._icon);
            
            if (this._jack.status == Status.IN){
            
                this.actor.show();
            }

            this._controlFlag = false;

        }
        this._needUpdateMenu = [];
        this._addMenu();
        this.updateMenu();
        this.connect('destroy', Lang.bind(this, this._onDestroy));
        
    },
    _statusChanged : function ()
    {

        if (this._jack.status == Status.IN){
            
            this.actor.show();
            
            if (this._player.getPlaybackStatus() == 'Paused' && this._controlFlag){
                
                this._player.play();
                
            }
        }
        else{
            
            this.actor.hide();
            
            if (this._player.getPlaybackStatus() == 'Playing'){
                this._player.pause();
                this._controlFlag = true;
            }

        }
        this.updateMenu();
        return true;
    },
    updateMenu : function (){
        for (let i in this._needUpdateMenu){
            if (this._needUpdateMenu[i].id == this._jack.id){
                this._needUpdateMenu[i].actor.add_style_class_name('plugged');
            }
            else{
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
                }
                else if (!item.state && this.blackList.indexOf(item.id) == -1){
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
        this._player.destroy();
    }
});

let indicator;

function enable() {
    if (!indicator) {
        indicator = new Indicator();
        Main.panel.addToStatusArea('HeadPhoneIndicator', indicator);
    }
}

function disable() {
    if (indicator) {
        indicator.destroy();
        indicator = null;
    }
}
function init(metadata) {
    Util.initTranslations('headphone-indicator');
}
