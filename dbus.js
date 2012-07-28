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

const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Signals = imports.signals;

const BUS_NAME = 'org.mpris.MediaPlayer2.';
const BUS_PATH = '/org/mpris/MediaPlayer2';

const MediaServer2PlayerIFace = <interface name="org.mpris.MediaPlayer2.Player">
    <method name="Next"></method>
    <method name="Previous">
    </method>
    <method name="Pause">
    </method>
    <method name="PlayPause">
    </method>
    <method name="Stop">
    </method>
    <method name="Play">
    </method>
    <method name="Seek">
      <arg type="x" name="Offset" direction="in">
      </arg>
    </method>
    <method name="SetPosition">
      <arg type="o" name="TrackId" direction="in">
      </arg>
      <arg type="x" name="Position" direction="in">
      </arg>
    </method>
    <method name="OpenUri">
      <arg type="s" name="Uri" direction="in">
      </arg>
    </method>
    <signal name="Seeked">
      <arg type="x" name="Position">
      </arg>
    </signal>
    <property type="s" name="PlaybackStatus" access="read">
    </property>
    <property type="s" name="LoopStatus" access="readwrite">
    </property>
    <property type="d" name="Rate" access="readwrite">
    </property>
    <property type="b" name="Shuffle" access="readwrite">
    </property>
    <property type="a{sv}" name="Metadata" access="read">
    </property>
    <property type="d" name="Volume" access="readwrite">
    </property>
    <property type="x" name="Position" access="read">
    </property>
    <property type="d" name="MinimumRate" access="read">
    </property>
    <property type="d" name="MaximumRate" access="read">
    </property>
    <property type="b" name="CanGoNext" access="read">
    </property>
    <property type="b" name="CanGoPrevious" access="read">
    </property>
    <property type="b" name="CanPlay" access="read">
    </property>
    <property type="b" name="CanPause" access="read">
    </property>
    <property type="b" name="CanSeek" access="read">
    </property>
    <property type="b" name="CanControl" access="read">
    </property>
  </interface>;

const Media2ServerInfo  = Gio.DBusInterfaceInfo.new_for_xml(MediaServer2PlayerIFace);
const SupportPlayer = [
    'rhythmbox',
    'banshee',
    'audacious'
];//XXX that's kind of stupid

const Media2Server = new Lang.Class({
        
        Name: 'Media2Server',
        
        _init: function()
        {
            this._phonyProxy = [];

            for (var index in SupportPlayer){
                this._phonyProxy[index] = new Gio.DBusProxy({ g_connection: Gio.DBus.session,
			                                                   g_interface_name: Media2ServerInfo.name,
			                                                   g_interface_info: Media2ServerInfo,
			                                                   g_name: BUS_NAME+SupportPlayer[index],
			                                                   g_object_path: BUS_PATH,
                                                               g_flags: (Gio.DBusProxyFlags.DO_NOT_AUTO_START) });
                this._phonyProxy[index].init(null);
                
            }
        
        },
        
        getPlaybackStatus : function(){

            for (var index in this._phonyProxy){
                    if (this._phonyProxy[index].CanControl != null)
                        return this._phonyProxy[index].PlaybackStatus;
            }
            return null;
        },
        
        play : function (){

                this._phonyProxy.forEach(function (_this){
                    if (_this.CanControl != null)
                        _this.PlayRemote();
                });
        
        },
        pause : function (){

                this._phonyProxy.forEach(function (_this){
                    if (_this.CanControl != null )
                        _this.PauseRemote();
                }); 
        
        },
        destroy : function ()
        {
            this.disconnectAll();
            this._phonyProxy = null;
        }
});
Signals.addSignalMethods(Media2Server.prototype);
