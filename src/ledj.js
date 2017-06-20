if (typeof _ === 'undefined') {
    throw new Error('Ledj requires Lodash. Lodash must be included before Ledj\'s JavaScript.')
}

(function(window){
    'use strict';
    function define_ledj() {
        var Ledj = {};

        Ledj.cache = {
            jsonConfig: [],
            jsonData: [],
            jsonUrl: [],
            elementID: [],
            curCacheID: -1
        };

        // todo: If I stored all the class and ID names in a config object,
        // todo: I could add functionality to change those class/ID names.

        Ledj.templates = {
            parent: _.template( // todo: add the ability to modify the parent template (class? title could be an issue).
                '<div class="ledj-container">' +
                    '<% if(title) { print(title); } %>' +
                    '<%= childHTML %>' +
                '</div>'
            ),
            linkGrid: _.template(
                '<div class="ledj-link-grid">' +
                '<% _.forEach(linkItems, function(linkItem) { %>' +
                    '<a class="link-grid-item" href="<%= linkItem[itemHrefKey] %>"<% if(newTab) { %> target="_blank" <% } %>>' +
                        '<img src="<%= getImageUrl(linkItem[itemImageKey], cacheID, objectKey) %>" title="<%= linkItem[itemTitleKey] %>" />' +
                        '<span><%= linkItem[itemTitleKey] %></span>' +
                    '</a>' +
                '<% }); %>' +
                '</div>'
            ),
            table: _.template(
                //'<table class="ledj-table">' +
                '<span>todo</span>' // +
                //'</table>' +
            ),
            gifGrid: _.template(
                //'<div class="ledj-gif-grid">' +
                '<span>todo</span>' // +
                //'</div>'
            )
        };

        /*
        Checks if a specified URL gives a status of 200
         */
        Ledj.urlExists = function(url, callbackSuccess, callbackFail, callbackArg) {
            var http = new XMLHttpRequest();
            http.open('HEAD', url);
            http.onreadystatechange = function() {
                if (this.readyState === this.DONE) {
                    if (this.status === 200) {
                        if(callbackSuccess !== null) { callbackSuccess(callbackArg); }
                        else { return 0; }
                    }
                    else {
                        if(callbackFail !== null) { callbackFail(callbackArg); }
                        else { return -1; }
                    }
                }
            };
            http.send();
        };

        Ledj.reset = function(cacheID) {
            resetElement(Ledj.cache.elementID[cacheID]);
        };

        Ledj.getJSONConfig = function(url, callback) {
            if(typeof url === 'string'){

                // Add date param to force clearing the browser cache
                url += '?dt=' + Date.now();

                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'json';
                xhr.onload = function() {
                    var status = xhr.status;
                    if (status === 200) { callback(null, xhr.response); }
                    else { callback(status); }
                };
                xhr.send();
            } else {
                callback('[url] must be a string.');
            }
        };

        /* Private Helper Functions */

        function getHostName() {
            return window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
        }

        function capitalize(string) {
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
        }

        function loadConfigFromUrl(url, callback) {
            Ledj.getJSONConfig(url, function(err, data) {
                if(err === null) {
                    if (data.hasOwnProperty('config') && data.hasOwnProperty('data')) {
                        Ledj.cache.curCacheID = Ledj.cache.jsonConfig.push(data.config) - 1;
                        Ledj.cache.jsonData[Ledj.cache.curCacheID] = data.data;
                        Ledj.cache.jsonUrl[Ledj.cache.curCacheID] = url;

                        callback(Ledj.cache.curCacheID);
                    } else {
                        err = 'JSON data must have `config` and `data` properties.';
                    }
                }

               if(err !== null) {
                   console.warn('Config file "' + url + '" could not be retrieved. ' + err);
               }
            });
        }

        function loadConfigFromObj(data, callback) {
            if (data.hasOwnProperty('config') && data.hasOwnProperty('data')) {
                Ledj.cache.curCacheID = Ledj.cache.jsonConfig.push(data.config) - 1;
                Ledj.cache.jsonData[Ledj.cache.curCacheID] = data.data;

                callback(Ledj.cache.curCacheID);
            } else {
                console.warn('Config object must have `config` and `data` properties.');
            }


        }

        function sortJsonDataBy(cacheID, propName) {
            if(Ledj.cache.jsonData[cacheID]) {
                if( Array.isArray(Ledj.cache.jsonData[cacheID]) ) {
                    Ledj.cache.jsonData[cacheID] = _.sortBy(Ledj.cache.jsonData[cacheID], propName);
                }

                else if(typeof Ledj.cache.jsonData[cacheID] === 'object') {
                    for(var item in Ledj.cache.jsonData[cacheID]) {
                        Ledj.cache.jsonData[cacheID][item] = _.sortBy(Ledj.cache.jsonData[cacheID][item], propName);
                    }
                }

                else {
                    console.warn('Could not sort cache.jsonData[' + cacheID + ']');
                }
            } else {
                console.warn('from Ledj.sortJsonDataBy(): `cache.jsonData[' + cacheID + ']` does not exist.');
            }
        }

        function sortData(cacheID) {
            // todo: search the config for how to sort data. if not specified, try to figure it out?
            sortJsonDataBy(cacheID, 'title'); // debug
        }

        function getLinkItemsData(cacheID, objectKey) {
            if(objectKey) {
                return Ledj.cache.jsonData[cacheID][objectKey];
            } else {
                return Ledj.cache.jsonData[cacheID];
            }
        }

        function getLinkGridFromData(cacheID, objectKey) {
            var templateData = {
                'linkItems': getLinkItemsData(cacheID, objectKey),
                'cacheID': cacheID,
                'objectKey': objectKey,
                'getImageUrl': getImageUrl, // really?
                'itemHrefKey': 'href',      // todo set this in json config
                'newTab': true,             // todo set this in json config
                'itemImageKey': 'filename', // todo set this in json config
                'itemTitleKey': 'title'     // todo set this in json config

            };

            return wrapHtmlInParent(Ledj.templates.linkGrid(templateData), cacheID, objectKey);
        }

        function getTableFromData(cacheID, objectKey) {
            var templateData = {
                'linkItems': getLinkItemsData(cacheID, objectKey)
            };

            return wrapHtmlInParent(Ledj.templates.table(templateData), cacheID, objectKey);
        }

        function getGifGridFromData(cacheID, objectKey) {
            var templateData = {
                'linkItems': getLinkItemsData(cacheID, objectKey)
            };

            return wrapHtmlInParent(Ledj.templates.gifGrid(templateData), cacheID, objectKey);
        }

        function wrapHtmlInParent(processedHTML, cacheID, objectKey) {
            return Ledj.templates.parent({
                'title': getElementTitle(cacheID, objectKey),
                'childHTML': processedHTML
            });
        }

        function addElementsTo(cacheID, elementID) {
            var element = document.getElementById(elementID);

            // Make sure the DOM element exists
            if(!!element) {
                // Store the valid elementID
                Ledj.cache.elementID[cacheID] = elementID;

                var functionToUse = null;

                switch(Ledj.cache.jsonConfig[cacheID].type.toLowerCase()) {
                    case 'link-grid':
                    case 'linkgrid':
                        functionToUse = getLinkGridFromData;
                        break;
                    case 'table':
                        functionToUse = getTableFromData;
                        break;
                    case 'gif-grid':
                    case 'gifgrid':
                        functionToUse = getGifGridFromData;
                        break;
                    default:
                        console.log('A fallback template is not yet implemented.');
                }

                if(!!functionToUse) {
                    var toAppend = '';

                    if( Array.isArray(Ledj.cache.jsonData[cacheID]) ) {
                        toAppend = functionToUse(cacheID);
                    }

                    else if(typeof Ledj.cache.jsonData[cacheID] === 'object') {
                        for(var item in Ledj.cache.jsonData[cacheID]) {
                            toAppend += functionToUse(cacheID, item);
                        }
                    }

                     else { // todo
                        console.warn('shouldn\'t get here');
                    }

                    if(toAppend !== '') {
                        element.innerHTML += toAppend;
                    }
                } else {
                    console.warn('A template could not be identified.');
                }
            } else {
                console.warn('Element ' + (!!elementID ? '#' + elementID : '[undefined]') + ' does not exist.');
            }
        }

        function getElementTitle(configID, objectKey) {
            if(!!objectKey && objectKey !== '') {
                var titleTag = 'h2';

                if( Ledj.cache.jsonConfig[configID].hasOwnProperty('titleElementLevel') &&
                    typeof parseInt(Ledj.cache.jsonConfig[configID].titleElementLevel) === 'number') {
                    titleTag = 'h' + Ledj.cache.jsonConfig[configID].titleElementLevel;
                }

                return '<' + titleTag + ' class="ledj-title">' + objectKey + '</' + titleTag + '>';
            } // else

            return null;
        }

        function getImageUrl(imageTitle, cacheID, objectKey) {
            var srcDir = '/';
            var ext = (Ledj.cache.jsonConfig[cacheID].hasOwnProperty('imgExt') ? Ledj.cache.jsonConfig[cacheID].imgExt : '');

            if(Ledj.cache.jsonConfig[cacheID].hasOwnProperty('srcDir')) {
                srcDir = Ledj.cache.jsonConfig[cacheID].srcDir;
            }

            else if(Ledj.cache.jsonConfig[cacheID].hasOwnProperty('srcDirs')) {
                if(!!objectKey && Ledj.cache.jsonConfig[cacheID].srcDirs.hasOwnProperty(objectKey)) {
                    srcDir = Ledj.cache.jsonConfig[cacheID].srcDirs[objectKey];
                }
                else if(Ledj.cache.jsonConfig[cacheID].srcDirs.hasOwnProperty('Default')) {
                    srcDir = Ledj.cache.jsonConfig[cacheID].srcDirs['Default'];
                }
                else if(Ledj.cache.jsonConfig[cacheID].srcDirs.hasOwnProperty('default')) {
                    srcDir = Ledj.cache.jsonConfig[cacheID].srcDirs['default'];
                }
            }

            return srcDir + imageTitle + ext;
        }

        function resetElement(elementID) {
            try {
                document.getElementById(elementID).innerHTML = '';
            } catch(e) {
                console.warn(e); // debug?
            }
        }

        /* End Private Helper Functions */

        /*
        Creates new HTML elements from specified JSON data URL
        and attaches them to the specified DOM element.
        This is the primary method for loading data and attaching elements.
         */
        Ledj.loadAndAttachTo = function(jsonUrl, elementID) {
            loadConfigFromUrl(jsonUrl, function(cacheID) {
                sortData(cacheID);
                addElementsTo(cacheID, elementID);
            });
        };

        /*
         Creates new HTML elements from specified JSON data object
         and attaches them to the specified DOM element.
         */
        Ledj.loadFromObjAndAttachTo = function(jsonData, elementID) {
            loadConfigFromObj(jsonData, function(cacheID) {
                sortData(cacheID);
                addElementsTo(cacheID, elementID);
            });
        };

        /*
         If the specified cache ID exists, the associated element is cleared,
         the data retrieved again, and the HTML elements re-added to that container.
         */
        Ledj.reloadFromUrlByID = function(cacheID) {
            var numCacheID = parseInt(cacheID);

            if(typeof numCacheID === 'number' && !!this.cache.jsonUrl[numCacheID] && !!this.cache.elementID[numCacheID]) {
                this.reset(numCacheID); // todo: make sure this works.
                this.loadAndAttachTo(this.cache.jsonUrl[numCacheID], this.cache.elementID[numCacheID]);
            } else {
                console.log('Could not reload: cacheID ' + cacheID + ' is invalid.');
            }
        };

        /*
         If the specified cache ID exists, the associated element is cleared,
         the cached data is replaced with the specified data, and the HTML elements re-added to that container.
         */
        Ledj.reloadFromObjByID = function(jsonData, cacheID) {
            var numCacheID = parseInt(cacheID);

            if(typeof numCacheID === 'number' && !!this.cache.elementID[numCacheID]) {
                this.reset(numCacheID);
                this.loadFromObjAndAttachTo(jsonData, this.cache.elementID[numCacheID]);
            } else {
                console.log('Could not reload: cacheID ' + cacheID + ' is invalid.');
            }
        };

        // Alias for Ledj.loadAndAttachTo
        Ledj.attach = Ledj.loadAndAttachTo;
        // Alias for Ledj.loadFromObjAndAttachTo
        Ledj.attachWith = Ledj.loadFromObjAndAttachTo;
        // Alias for Ledj.reloadFromUrlByID
        Ledj.reload =  Ledj.reloadFromUrlByID;
        // Alias for Ledj.reloadFromObjByID
        Ledj.reloadwith = Ledj.reloadFromObjByID;

        // Final Statement
        return Ledj;
    }

    if(typeof(Ledj) === 'undefined') {
        window.Ledj = define_ledj();
        //window.Ledj = define_Ledj();
    } else {
        console.log("Ledj is already defined.");
    }
})(window);