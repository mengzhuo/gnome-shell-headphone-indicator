const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Util = Extension.imports.util;
const BLACK_LIST_KEY_NAME = 'blacklist';

const Gettext = imports.gettext.domain('headphone-indicator');
const _ = Gettext.gettext;
const DONATION_URI = "http://amzn.com/w/D4WJ5SD3PW5W";


const HeadphoneSettingsWidget = new GObject.Class({
    Name: 'HeadphoneSettingsWidget',
    GTypeName: 'HeadphoneConfiguratorSettingsWidget',
    Extends: Gtk.Grid,
    
    _init : function (params){
    
        this.parent(params);
        this.margin = this.row_spacing = this.column_spacing = 6;
        
        this._settings = Util.getSettings('org.gnome.shell.extensions.headphone-indicator');
        
        this.attach(new Gtk.Label({ label:_("BlackListed Headphone Jack"), wrap: true, xalign: 0.0 }), 0, 0, 1, 1);
        
        this._blackList = JSON.stringify(this._settings.get_strv(BLACK_LIST_KEY_NAME));
        this._blackListEntry = new Gtk.Entry({ hexpand: true });
        this._blackListEntry.set_text(this._blackList);
        this.attach(this._blackListEntry, 1,0,2,1);
        
        this._applyBtn = new Gtk.Button({ label: _("Apply") });
        this.attach(this._applyBtn, 3,0,1,1);
        this._applyBtn.connect('clicked', Lang.bind(this, this._setBlackList));
    },
    _setBlackList : function (){
    
        let entry = this._blackListEntry.get_text();
        try {
            let checker = JSON.parse(entry);
            if ( typeof(checker) == 'object'){
                this._settings.set_strv(BLACK_LIST_KEY_NAME, checker);
            }
        }
        catch(e){
            global.log(e.message);
        }
    }
});

function init() {
    Util.initTranslations('headphone-indicator');
}
function buildPrefsWidget() {
    let widget = new HeadphoneSettingsWidget();
    widget.show_all();
    return widget;
}
