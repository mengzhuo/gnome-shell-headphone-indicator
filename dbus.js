/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
/**
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/

const Gio = imports.gi.Gio;
const Lang = imports.lang;

const DBusIface = <interface name="org.freedesktop.DBus">
<method name="GetNameOwner">
    <arg type="s" direction="in" />
    <arg type="s" direction="out" />
</method>
<method name="ListNames">
    <arg type="as" direction="out" />
</method>
<signal name="NameOwnerChanged">
    <arg type="s" direction="out" />
    <arg type="s" direction="out" />
    <arg type="s" direction="out" />
</signal>
</interface>;
const DBusProxy = Gio.DBusProxy.makeProxyWrapper(DBusIface);

const MediaServer2PlayerIface = <interface name="org.mpris.MediaPlayer2.Player">
<method name="PlayPause" />
<method name="Pause" />
<method name="Play" />
<method name="Stop" />
<method name="Next" />
<method name="Previous" />
<method name="SetPosition">
    <arg type="o" direction="in" />
    <arg type="x" direction="in" />
</method>
<property name="Metadata" type="a{sv}" access="read" />
<property name="Volume" type="d" access="readwrite" />
<property name="PlaybackStatus" type="s" access="read" />
<property name="Position" type="x" access="read" />
<signal name="Seeked">
    <arg type="x" direction="out" />
</signal>
</interface>
const MediaServer2PlayerProxy = Gio.DBusProxy.makeProxyWrapper(MediaServer2PlayerIface);

function DBus() {
    return new DBusProxy(Gio.DBus.session, 'org.freedesktop.DBus',
                         '/org/freedesktop/DBus');
}

function MediaServer2Player(owner) {
    return new MediaServer2PlayerProxy(Gio.DBus.session, owner,
                                       '/org/mpris/MediaPlayer2');
}
