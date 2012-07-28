// HeadPhone indicator extension for Gnome-shell
//
// Based on 'convenience.js'
//
// Copyright (C) 2012 Meng Zhuo<mengzhuo1203@gmail.com>
//               2012 GNOME Shell Extensions developers
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

const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Config = imports.misc.config;

/**
 * initTranslations:
 * @domain: (optional): the gettext domain to use
 *
 * Initialize Gettext to load translations from extensionsdir/locale.
 * If @domain is not provided, it will be taken from metadata['gettext-domain']
 */
function initTranslations(domain) {
    let extension = ExtensionUtils.getCurrentExtension();

    domain = domain || extension.metadata['gettext-domain'];

    // check if this extension was built with "make zip-file", and thus
    // has the locale files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell
    let localeDir = extension.dir.get_child('locale');
    if (localeDir.query_exists(null))
        Gettext.bindtextdomain(domain, localeDir.get_path());
    else
        Gettext.bindtextdomain(domain, Config.LOCALEDIR);
}
function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                                 GioSSS.get_default(),
                                                 false);
    else
        schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error('Schema ' + schema + ' could not be found for extension '
                        + extension.metadata.uuid + '. Please check your installation.');

    return new Gio.Settings({ settings_schema: schemaObj });
}
/* 
// JSON method
const BlackList = new Lang.Class({
        
        Name:'HeadPhone.BlackList',
        
        _init:function (){
             this._blackListFile = Gio.file_new_for_path(Extension.path+"/blacklist.json");

             this._monitor = this._blackListFile.monitor_file(Gio.FileMonitorFlags.NONE, null);
             this._monitor.connect('changed',Lang.bind( this,this.read ));

             this.read();
             
             this.items = this.json.blackList;
             
        },
        read : function (){
            if(this._blackListFile.query_exists(null)) {
                let contents = this._blackListFile.load_contents(null)[1];
			    this.json = JSON.parse( contents );
	        }
		    else{
		        throw new Error('HeadPhone:Can not load blackList');
		    }
        },
        save: function() {
		    try{
			    this._blackListFile.replace_contents(JSON.stringify(this.json), null, false, 0,null);
		    }
		    catch(e){
		        throw new Error('An error occurred while saving blackList:'+e.message);
	        }
	    },
	    pushId :function(item){
	         if ( item > -1 && this.json.blackList.indexOf(item) == -1 ){
                this.json.blackList.push(item);
                this.save();
                return true;
             }
	    },
	    deleteId : function (item){
	        if (item > -1 && this.json.blackList.indexOf(item) > -1){
	            delete this.json.blackList[this.json.blackList.indexOf(item)];
	            //clear 
	            for (let i in this.json.blackList){
                    if (typeof(this.json.blackList[i]) != 'number'){
                        this.json.blackList.splice(i,1);
                    }
                }
	            this.save();
	            return true;
	        }
	    },
	    get : function(){
	        return this.json.blackList; //quite disorientate :)
	    },
	    destroy : function (){
	        this._onDestroy();
	    },
	    _onDestroy : function(){
	        this._monitor.disconnect();
	    }
});
*/
