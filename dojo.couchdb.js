function CouchDB( options ) {
    options = options || { };
    var self = {};
    var toJson = dojo.toJson;
    var user_prefix = 'org.couchdb.user:';
    function init( ) {
        self.base = options.base || '';
        self.db = options.db;
        return self;
    }
    self.get = function( path, options ) {
        var opts = options || {};
        for( var key in opts ) {
            opts[ key ] = toJson( opts[ key ] );
        }
        if( !toJson( opts ) !== "{}" ) {
            if( path.indexOf( '?' ) > -1 ) {
                path += '&';
            } else {
                path += '?';
            }
            path += dojo.objectToQuery( opts );
        }
        return self.request( 'GET', path );
    };
    self.put = function( doc, path ) {
        if( doc._id ) {
            path = doc._id;
        } else if( !path ) {
            path = self.uuid( );
        }
        return self.request( 'PUT', path, doc );
    };
    self.del = function( doc ) {
        return self.request( 'DELETE', doc._id + '?rev=' + doc._rev );
    };
    self.request = function( method, path, content ) {
        path = self.base + '/' + self.db + '/' + path;

        var hasBody = false;
        var rawBody = null;
        if( content ) {
            hasBody = true;
            rawBody = toJson( content );
        }

        var d = dojo.xhr( method, {
            url: path,
            handleAs: 'json',
            rawBody: rawBody
        }, hasBody );
        d.addErrback( function( err ) {
            if( err.status === 401 ) {
                dojo.publish( 'couchdb/401', [ err ] );
            }
            throw( err )
        } );
        return d;
    };
    self.session = function( ) {
        return dojo.xhrGet( {
            url: self.base + '/_session',
            handleAs: 'json'
        } );
    };
    self.login = function( credentials ) {
        return dojo.xhr( 'POST', {
            url: self.base + '/_session',
            content: credentials,
            handleAs: 'json'
        } );
    };
    self.logout = function( ) {
        return dojo.xhr( 'DELETE', {
            url: self.base + '/_session',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded',
                       'X-CouchDB-WWW-Authenticate': 'Cookie' },
            handleAs: 'json'
        } );
    };
    self.signup = function( user_doc, new_password ) {
        if (typeof hex_sha1 == "undefined") {
            alert("creating a user doc requires sha1.js to be loaded in the page");
            return;
        }
        user_doc._id = user_doc._id || user_prefix + user_doc.name;
        if (new_password) {
            // handle the password crypto
            user_doc.salt = self.uuid( );
            user_doc.password_sha = hex_sha1(new_password + user_doc.salt);
        }
        user_doc.type = "user";
        if (!user_doc.roles) {
            user_doc.roles = []
        }

        var d = dojo.xhr( 'PUT', {
            url: self.base + '/_users/' + user_doc._id,
            handleAs: 'json',
            rawBody: toJson( user_doc )
        }, true );
        return d;
    };
    self.updatePassword = function( name, new_password ) {
        var d = self.getUserDoc( name );
        d.addCallback( function( current_user_doc ) {
            return self.signup( current_user_doc, new_password );
        } );
        return d;
    };
    self.getUserDoc = function( name ) {
        return dojo.xhr( 'GET', {
            url: self.base + '/_users/' + user_prefix + name,
            handleAs: 'json'
        } );
    };
    self.delUser = function( name ) {
        var d = self.getUserDoc( name );
        d.addCallback( function( doc ) {
            return dojo.xhr( 'DELETE', {
                url: self.base + '/_users/' + user_prefix + name + '?rev=' + doc._rev,
                handleAs: 'json'
            } );
        } );
        return d;
    };
    self.uuid = function( ){
        var HEX_RADIX = 16;
        function _generateRandomEightCharacterHexString(){
            var random32bitNumber = Math.floor( (Math.random() % 1) * Math.pow(2, 32) );
            var eightCharacterHexString = random32bitNumber.toString(HEX_RADIX);
            while(eightCharacterHexString.length < 8){
                eightCharacterHexString = "0" + eightCharacterHexString;
            }
            return eightCharacterHexString;
        }
        var versionCodeForRandomlyGeneratedUuids = "4";
        var variantCodeForDCEUuids = "8";
        var a = _generateRandomEightCharacterHexString();
        var b = _generateRandomEightCharacterHexString();
        b = b.substring(0, 4) + versionCodeForRandomlyGeneratedUuids + b.substring(5, 8);
        var c = _generateRandomEightCharacterHexString();
        c = variantCodeForDCEUuids + c.substring(1, 4) + c.substring(4, 8);
        var d = _generateRandomEightCharacterHexString();
        var returnValue = a + b + c + d;
        returnValue = returnValue.toLowerCase();
        return returnValue;
    };
    return init( );
}
