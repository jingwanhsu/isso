define(["app/lib/promise", "app/globals"], function(Q, globals) {

    "use strict";

    var salt = "Eech7co8Ohloopo9Ol6baimi",
        location = window.location.pathname;

    var script, endpoint,
        js = document.getElementsByTagName("script");

    // prefer `data-isso="//host/api/endpoint"` if provided
    for (var i = 0; i < js.length; i++) {
        if (js[i].hasAttribute("data-isso")) {
            endpoint = js[i].getAttribute("data-isso");
            break;
        }
    }

    // if no async-script is embedded, use the last script tag of `js`
    if (! endpoint) {
        for (i = 0; i < js.length; i++) {
            if (js[i].getAttribute("async") || js[i].getAttribute("defer")) {
                throw "Isso's automatic configuration detection failed, please " +
                      "refer to https://github.com/posativ/isso#client-configuration " +
                      "and add a custom `data-isso` attribute.";
            }
        }

        script = js[js.length - 1];
        endpoint = script.src.substring(0, script.src.length - "/js/embed.min.js".length);
    }

    //  strip trailing slash
    if (endpoint[endpoint.length - 1] === "/") {
        endpoint = endpoint.substring(0, endpoint.length - 1);
    }

    var curl = function(method, url, data, resolve, reject) {

        var xhr = new XMLHttpRequest();

        function onload() {

            var date = xhr.getResponseHeader("Date");
            if (date !== null) {
                globals.offset.update(new Date(date));
            }

            var cookie = xhr.getResponseHeader("X-Set-Cookie");
            if (cookie && cookie.match(/^isso-/)) {
                document.cookie = cookie;
            }

            if (xhr.status >= 500) {
                reject(xhr.body);
            } else {
                resolve({status: xhr.status, body: xhr.responseText});
            }
        }

        try {
            xhr.open(method, url, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Content-Type", "application/json");

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    onload();
                }
            };
        } catch (exception) {
            (reject || console.log)(exception.message);
        }

        xhr.send(data);
    };

    var qs = function(params) {
        var rv = "";
        for (var key in params) {
            if (params.hasOwnProperty(key) && params[key]) {
                rv += key + "=" + encodeURIComponent(params[key]) + "&";
            }
        }

        return rv.substring(0, rv.length - 1);  // chop off trailing "&"
    };

    var create = function(tid, data) {
        var deferred = Q.defer();
        curl("POST", endpoint + "/new?" + qs({uri: tid || location}), JSON.stringify(data),
            function (rv) { deferred.resolve(JSON.parse(rv.body)); });
        return deferred.promise;
    };

    var modify = function(id, data) {
        var deferred = Q.defer();
        curl("PUT", endpoint + "/id/" + id, JSON.stringify(data), function (rv) {
            if (rv.status === 403) {
                deferred.reject("Not authorized to modify this comment!");
            } else if (rv.status === 200) {
                deferred.resolve(JSON.parse(rv.body));
            } else {
                deferred.reject(rv.body);
            }
        });
        return deferred.promise;
    };

    var remove = function(id) {
        var deferred = Q.defer();
        curl("DELETE", endpoint + "/id/" + id, null, function(rv) {
            if (rv.status === 403) {
                deferred.reject("Not authorized to remove this comment!");
            } else if (rv.status === 200) {
                deferred.resolve(JSON.parse(rv.body) === null);
            } else {
                deferred.reject(rv.body);
            }
        });
        return deferred.promise;
    };

    var view = function(id, plain) {
        var deferred = Q.defer();
        curl("GET", endpoint + "/id/" + id + "?" + qs({plain: plain}), null,
            function(rv) { deferred.resolve(JSON.parse(rv.body)); });
        return deferred.promise;
    };

    var fetch = function(tid) {
        var deferred = Q.defer();
        curl("GET", endpoint + "/?" + qs({uri: tid || location}), null, function(rv) {
            if (rv.status === 200) {
                deferred.resolve(JSON.parse(rv.body));
            } else if (rv.status === 404) {
                deferred.resolve([]);
            } else {
                deferred.reject(rv.body);
            }
        });
        return deferred.promise;
    };

    var count = function(urls) {
        var deferred = Q.defer();
        curl("POST", endpoint + "/count", JSON.stringify(urls), function(rv) {
            if (rv.status === 200) {
                deferred.resolve(JSON.parse(rv.body));
            } else {
                deferred.reject(rv.body);
            }
        });
        return deferred.promise;
    };

    var like = function(id) {
        var deferred = Q.defer();
        curl("POST", endpoint + "/id/" + id + "/like", null,
            function(rv) { deferred.resolve(JSON.parse(rv.body)); });
        return deferred.promise;
    };

    var dislike = function(id) {
        var deferred = Q.defer();
        curl("POST", endpoint + "/id/" + id + "/dislike", null,
            function(rv) { deferred.resolve(JSON.parse(rv.body)); });
        return deferred.promise;
    };

    var remote_addr = function() {
        var deferred = Q.defer();
        curl("GET", endpoint + "/check-ip", null, function(rv) {
            if (rv.status === 200) {
                deferred.resolve(rv.body);
            } else {
                deferred.reject(rv.body);
            }
        });
        return deferred.promise;
    };

    return {
        endpoint: endpoint,
        salt: salt,
        remote_addr: remote_addr,

        create: create,
        modify: modify,
        remove: remove,
        view: view,
        fetch: fetch,
        count: count,
        like: like,
        dislike: dislike
    };
});
