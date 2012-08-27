// A headphone indicator for Gnome-shell
// Copyright (C) 2012 Meng Zhuo, Gnome-shell headphone Indicator extension contributors
//
// This is a jack detection class using ALSA as its backend
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

const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Signals = imports.signals;
const Mainloop = imports.mainloop;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Util = Extension.imports.util;

const HIGH_SENSITIVE_TIMEOUT = 250;
const LOW_SENSITIVE_TIMEOUT  = 1500; //pulgged is not an urgent task. 

const CardInfoCommandLine = 'amixer -c0 contents'; // XXX: on card 1 since most of laptop has only one sound card.
const HeadPhoneJACK       = 'Headphone Jack';
const ONFlag              = '=on';
const JackInfoCommandLine = 'amixer -c0 cget numid=%s';

/*
* FIXME
* There is an undocumented way, which can't find in man or help but written in the source code,
* to monitor the events of amixer(like jack plugged)
* which saves huge amount of CPU resources.
* But I can't read standard output of it or run it as daemon, any help?
* const AmixerEventsCommandLine = 'amixer events';
*/

const BLACK_LIST_KEY_NAME = 'blacklist';

const Status = {
    NONEXIST: 0,
    IN: 1,
    OUT: 2,
    UNKNOWN: 3
};

const HeadPhoneJack = new Lang.Class({
    
    Name: 'HeadPhoneJack',
    
    _init : function ()
    {
        this.connect('destroy', Lang.bind(this, this._onDestroy));

        this._oldStatus = this.status = Status.UNKNOWN;
        this._jackNumIDList = [];
        
        try {
            // Load setting
            this._settings = Util.getSettings("org.gnome.shell.extensions.headphone-indicator");
            this._settingSiganlID = this._settings.connect('changed', Lang.bind(this, this._onSettingsChanged));
            
            this.blackList = this._settings.get_strv(BLACK_LIST_KEY_NAME);
            
            if (!this.blackList)
                throw new Error('Can not load setting');

            //find HeadPhone Jack numid;
            this._cardDevices = GLib.spawn_command_line_sync(CardInfoCommandLine)[1].toString().split('num');
            // if there is no sound card or amixer exist, it will break ;
            
            let id = null;
            let description = null;
            let cardDevice = null;
            
            for (let i in this._cardDevices){
                
                if ( this._cardDevices[i].indexOf(HeadPhoneJACK) >= 0 ){ 
                    
                    //using indexOf to make speed up http://jsperf.com/regexp-vs-indexof
                    cardDevice = this._cardDevices[i].split(',');
                    
                    id = cardDevice[0].match(/id=(\d+)/)[1];
                    description = cardDevice[2].match(/name=\'(.+)\'/)[1];
                    
                    if ( id > 0 ){ //remove none item
                    
                        this._jackNumIDList.push({ command: JackInfoCommandLine.format(id),
                                                    description:description,
                                                    id:id
                        });
                        //made those command line in array
                    }
                
                }
                
            }

            if (this._jackNumIDList.length == 0)
                throw new Error('No Jack port founded');
            
            delete this._cardDevices; // save some RAM 
            
            this.status = Status.OUT; //First guess
            
            this._onSettingsChanged();
            
            this._update();
            
            this._mainLoopID = Mainloop.timeout_add(LOW_SENSITIVE_TIMEOUT, Lang.bind(this, this._update)); 
        }
        catch(e) {
            this.status = Status.NONEXIST;
            throw new Error('HeadPhone Initializing Error: '+ e.message);
        }
    },
    _onSettingsChanged : function (){
        try {
            this.blackList = this._settings.get_strv(BLACK_LIST_KEY_NAME);
            this._updateList = new Array;
            for (let i in this._jackNumIDList){
                if ( this.blackList.indexOf(this._jackNumIDList[i].id) == -1){
                    this._updateList.push(this._jackNumIDList[i].id);
                }
            }
        }
        catch(e){
            throw new Error('[HeadPhone Jack]'+e.message);
        }
    },
    _update : function (){
        
        /*XXX:This kind of update method needs to be modify
        * since it just simply runs command in mainloop
        * we need higher library to make this done
        */
        try {
            for( let i in this._updateList){
            
                    if ( GLib.spawn_command_line_sync(this._updateList[i].command)[1].toString().lastIndexOf(ONFlag) >= 0 ){
                        this.status = Status.IN;
                        this.id = this._jackNumIDList[i].id;
                        break; //there is no different if more than 1 jack plugged.
                    }
                    
            }
            if (this._oldStatus != this.status){
            
                this._changeLoopID();
                this._oldStatus = this.status;
                this.emit('status-changed');

            }
            return true;
        }
        catch(e){
            throw new Error('[HeadPhone Jack]'+e.message);
            return false; // for mainloop
        }
        
    },
    _changeLoopID : function (){

        try {
            
            this._loopInterval = (this.status == Status.IN)?HIGH_SENSITIVE_TIMEOUT:LOW_SENSITIVE_TIMEOUT;
            
            Mainloop.source_remove(this._mainLoopID);
            this._mainLoopID = Mainloop.timeout_add(this._loopInterval, Lang.bind(this, this._update));
            
            return true;
        }
        catch(e){
            throw new Error('[HeadPhone Jack]'+e.message);
            return false;
        }
    },
    destroy : function (){
        
        this._onDestroy();
    },
    _onDestroy : function(){
        
        Mainloop.source_remove(this._mainLoopID);
        this._settings.disconnect(this._settingSiganlID);
    }
});
Signals.addSignalMethods(HeadPhoneJack.prototype);
