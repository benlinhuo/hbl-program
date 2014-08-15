function newContext(contextName) {
    var inCheckLoaded, Module, context, handlers,
        checkLoadedTimeoutId,
        config = {
            //Defaults. Do not set a default for map
            //config to speed up normalize(), which
            //will run faster if there is no default.
            waitSeconds: 7,
            baseUrl: './',
            paths: {},
            bundles: {},
            pkgs: {},
            shim: {},
            config: {}
        },
        registry = {},
    //registry of just enabled modules, to speed
    //cycle breaking code when lots of modules
    //are registered, but not activated.
        enabledRegistry = {},
        undefEvents = {},
        defQueue = [],
        defined = {},
        urlFetched = {},
        bundlesMap = {},
        requireCounter = 1,
        unnormalizedCounter = 1;

    //req({})初始化上下文，只会执行以上的初始化内容




    

    handlers = {
        'require': function (mod) {
            if (mod.require) {
                return mod.require;
            } else {
                return (mod.require = context.makeRequire(mod.map));
            }
        },
        'exports': function (mod) {
            mod.usingExports = true;
            if (mod.map.isDefine) {
                if (mod.exports) {
                    return (defined[mod.map.id] = mod.exports);
                } else {
                    return (mod.exports = defined[mod.map.id] = {});
                }
            }
        },
        'module': function (mod) {
            if (mod.module) {
                return mod.module;
            } else {
                return (mod.module = {
                    id: mod.map.id,
                    uri: mod.map.url,
                    config: function () {
                        return  getOwn(config.config, mod.map.id) || {};
                    },
                    exports: mod.exports || (mod.exports = {})
                });
            }
        }
    };

   



    Module = function (map) {
        this.events = getOwn(undefEvents, map.id) || {};
        this.map = map;
        this.shim = getOwn(config.shim, map.id);
        this.depExports = [];
        this.depMaps = [];
        this.depMatched = [];
        this.pluginMaps = {};
        this.depCount = 0;

        /* this.exports this.factory
         this.depMaps = [],
         this.enabled, this.fetched
         */
    };

    Module.prototype = {
        init: function (depMaps, factory, errback, options) {
            options = options || {};

            //Do not do more inits if already done. Can happen if there
            //are multiple define calls for the same module. That is not
            //a normal, common case, but it is also not unexpected.
            if (this.inited) {
                return;
            }

            this.factory = factory;

            if (errback) {
                //Register for errors on this module.
                this.on('error', errback);
            } else if (this.events.error) {
                //If no errback already, but there are error listeners
                //on this module, set up an errback to pass to the deps.
                errback = bind(this, function (err) {
                    this.emit('error', err);
                });
            }

            //Do a copy of the dependency array, so that
            //source inputs are not modified. For example
            //"shim" deps are passed in here directly, and
            //doing a direct modification of the depMaps array
            //would affect that config.
            //此处用slice，而不是直接赋值，是因为它可能是个array,直接赋值就是引用了
            this.depMaps = depMaps && depMaps.slice(0);

            this.errback = errback;

            //Indicate this module has be initialized
            this.inited = true;

            this.ignore = options.ignore;

            //Could have option to init this module in enabled mode,
            //or could have been previously marked as enabled. However,
            //the dependencies are not known until init is called. So
            //if enabled previously, now trigger dependencies as enabled.
            //有option去初始化一个module，或者标记以前已经marked的模块。然后对于其依赖，需要等到被调用的时候才知道。
            //所以，如果以前已经enabled过，则现在只要触发依赖项作为enabled即可。
            if (options.enabled || this.enabled) {
                //Enable this module and dependencies.
                //Will call this.check()
                this.enable();
            } else {
                this.check();
            }
        },

        defineDep: function (i, depExports) {
            //Because of cycles, defined callback for a given
            //export can be called more than once.
            if (!this.depMatched[i]) {
                this.depMatched[i] = true;
                this.depCount -= 1;
                this.depExports[i] = depExports;
            }
        },

        fetch: function () {
            if (this.fetched) {
                return;
            }
            this.fetched = true;

            context.startTime = (new Date()).getTime();

            var map = this.map;

            //If the manager is for a plugin managed resource,
            //ask the plugin to load it now.
            if (this.shim) {
                context.makeRequire(this.map, {
                    enableBuildCallback: true
                })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
            } else {
                //Regular dependency.
                return map.prefix ? this.callPlugin() : this.load();
            }
        },

        load: function () {
            var url = this.map.url;

            //Regular dependency.
            if (!urlFetched[url]) {
                urlFetched[url] = true;
                context.load(this.map.id, url);
            }
        },

        /**
         * Checks if the module is ready to define itself, and if so,
         * define it.

         检查该模块是否准备好定义自身，如果是的话，就定义自身
         */
        check: function () {
            if (!this.enabled || this.enabling) {
                return;
            }

            var err, cjsModule,
                id = this.map.id,
                depExports = this.depExports,
                exports = this.exports,
                factory = this.factory;

            if (!this.inited) {
                this.fetch();
            } else if (this.error) {
                this.emit('error', this.error);
            } else if (!this.defining) {
                //The factory could trigger another require call
                //that would result in checking this module to
                //define itself again. If already in the process
                //of doing that, skip this work.
                this.defining = true;

                if (this.depCount < 1 && !this.defined) {
                    if (isFunction(factory)) {
                        //If there is an error listener, favor passing
                        //to that instead of throwing an error. However,
                        //only do it for define()'d  modules. require
                        //errbacks should not be called for failures in
                        //their callbacks (#699). However if a global
                        //onError is set, use that.
                        if ((this.events.error && this.map.isDefine) ||
                            req.onError !== defaultOnError) {
                            try {
                                exports = context.execCb(id, factory, depExports, exports);
                            } catch (e) {
                                err = e;
                            }
                        } else {
                            exports = context.execCb(id, factory, depExports, exports);
                        }

                        // Favor return value over exports. If node/cjs in play,
                        // then will not have a return value anyway. Favor
                        // module.exports assignment over exports object.
                        if (this.map.isDefine && exports === undefined) {
                            cjsModule = this.module;
                            if (cjsModule) {
                                exports = cjsModule.exports;
                            } else if (this.usingExports) {
                                //exports already set the defined value.
                                exports = this.exports;
                            }
                        }

                        if (err) {
                            err.requireMap = this.map;
                            err.requireModules = this.map.isDefine ? [this.map.id] : null;
                            err.requireType = this.map.isDefine ? 'define' : 'require';
                            return onError((this.error = err));
                        }

                    } else {
                        //Just a literal value
                        exports = factory;
                    }

                    this.exports = exports;

                    if (this.map.isDefine && !this.ignore) {
                        defined[id] = exports;

                        if (req.onResourceLoad) {
                            req.onResourceLoad(context, this.map, this.depMaps);
                        }
                    }

                    //Clean up
                    cleanRegistry(id);

                    this.defined = true;
                }

                //Finished the define stage. Allow calling check again
                //to allow define notifications below in the case of a
                //cycle.
                this.defining = false;

                if (this.defined && !this.defineEmitted) {
                    this.defineEmitted = true;
                    this.emit('defined', this.exports);
                    this.defineEmitComplete = true;
                }

            }
        },

        callPlugin: function () {
            var map = this.map,
                id = map.id,
            //Map already normalized the prefix.
                pluginMap = makeModuleMap(map.prefix);

            //Mark this as a dependency for this plugin, so it
            //can be traced for cycles.
            this.depMaps.push(pluginMap);

            on(pluginMap, 'defined', bind(this, function (plugin) {
                var load, normalizedMap, normalizedMod,
                    bundleId = getOwn(bundlesMap, this.map.id),
                    name = this.map.name,
                    parentName = this.map.parentMap ? this.map.parentMap.name : null,
                    localRequire = context.makeRequire(map.parentMap, {
                        enableBuildCallback: true
                    });

                //If current map is not normalized, wait for that
                //normalized name to load instead of continuing.
                if (this.map.unnormalized) {
                    //Normalize the ID if the plugin allows it.
                    if (plugin.normalize) {
                        name = plugin.normalize(name, function (name) {
                            return normalize(name, parentName, true);
                        }) || '';
                    }

                    //prefix and name should already be normalized, no need
                    //for applying map config again either.
                    normalizedMap = makeModuleMap(map.prefix + '!' + name,
                        this.map.parentMap);
                    on(normalizedMap,
                        'defined', bind(this, function (value) {
                            this.init([], function () { return value; }, null, {
                                enabled: true,
                                ignore: true
                            });
                        }));

                    normalizedMod = getOwn(registry, normalizedMap.id);
                    if (normalizedMod) {
                        //Mark this as a dependency for this plugin, so it
                        //can be traced for cycles.
                        this.depMaps.push(normalizedMap);

                        if (this.events.error) {
                            normalizedMod.on('error', bind(this, function (err) {
                                this.emit('error', err);
                            }));
                        }
                        normalizedMod.enable();
                    }

                    return;
                }

                //If a paths config, then just load that file instead to
                //resolve the plugin, as it is built into that paths layer.
                if (bundleId) {
                    this.map.url = context.nameToUrl(bundleId);
                    this.load();
                    return;
                }

                load = bind(this, function (value) {
                    this.init([], function () { return value; }, null, {
                        enabled: true
                    });
                });

                load.error = bind(this, function (err) {
                    this.inited = true;
                    this.error = err;
                    err.requireModules = [id];

                    //Remove temp unnormalized modules for this module,
                    //since they will never be resolved otherwise now.
                    eachProp(registry, function (mod) {
                        if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                            cleanRegistry(mod.map.id);
                        }
                    });

                    onError(err);
                });

                //Allow plugins to load other code without having to know the
                //context or how to 'complete' the load.
                load.fromText = bind(this, function (text, textAlt) {
                    /*jslint evil: true */
                    var moduleName = map.name,
                        moduleMap = makeModuleMap(moduleName),
                        hasInteractive = useInteractive;

                    //As of 2.1.0, support just passing the text, to reinforce
                    //fromText only being called once per resource. Still
                    //support old style of passing moduleName but discard
                    //that moduleName in favor of the internal ref.
                    if (textAlt) {
                        text = textAlt;
                    }

                    //Turn off interactive script matching for IE for any define
                    //calls in the text, then turn it back on at the end.
                    if (hasInteractive) {
                        useInteractive = false;
                    }

                    //Prime the system by creating a module instance for
                    //it.
                    getModule(moduleMap);

                    //Transfer any config to this other module.
                    if (hasProp(config.config, id)) {
                        config.config[moduleName] = config.config[id];
                    }

                    try {
                        req.exec(text);
                    } catch (e) {
                        return onError(makeError('fromtexteval',
                            'fromText eval for ' + id +
                                ' failed: ' + e,
                            e,
                            [id]));
                    }

                    if (hasInteractive) {
                        useInteractive = true;
                    }

                    //Mark this as a dependency for the plugin
                    //resource
                    this.depMaps.push(moduleMap);

                    //Support anonymous modules.
                    context.completeLoad(moduleName);

                    //Bind the value of that module to the value for this
                    //resource ID.
                    localRequire([moduleName], load);
                });

                //Use parentName here since the plugin's name is not reliable,
                //could be some weird string with no path that actually wants to
                //reference the parentName's path.
                plugin.load(map.name, localRequire, load, config);
            }));

            context.enable(pluginMap, this);
            this.pluginMaps[pluginMap.id] = pluginMap;
        },

        enable: function () {
            enabledRegistry[this.map.id] = this;
            this.enabled = true;

            //Set flag mentioning that the module is enabling,
            //so that immediate calls to the defined callbacks
            //for dependencies do not trigger inadvertent load
            //with the depCount still being zero.
            this.enabling = true;

            //Enable each dependency
            //enable该模块的每个依赖
            each(this.depMaps, bind(this, function (depMap, i) {
                var id, mod, handler;

                if (typeof depMap === 'string') {
                    //Dependency needs to be converted to a depMap
                    //and wired up to this module.
                    depMap = makeModuleMap(depMap,
                        (this.map.isDefine ? this.map : this.map.parentMap),
                        false,
                        !this.skipMap);
                    this.depMaps[i] = depMap;

                    handler = getOwn(handlers, depMap.id);

                    if (handler) {
                        this.depExports[i] = handler(this);
                        return;
                    }

                    this.depCount += 1;

                    on(depMap, 'defined', bind(this, function (depExports) {
                        this.defineDep(i, depExports);
                        this.check();
                    }));

                    if (this.errback) {
                        on(depMap, 'error', bind(this, this.errback));
                    }
                }

                id = depMap.id;
                mod = registry[id];

                //Skip special modules like 'require', 'exports', 'module'
                //Also, don't call enable if it is already enabled,
                //important in circular dependency cases.
                if (!hasProp(handlers, id) && mod && !mod.enabled) {
                    context.enable(depMap, this);
                }
            }));

            //Enable each plugin that is used in
            //a dependency
            //enable在每个依赖中的插件
            eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                var mod = getOwn(registry, pluginMap.id);
                if (mod && !mod.enabled) {
                    context.enable(pluginMap, this);
                }
            }));

            this.enabling = false;

            this.check();
        },

        on: function (name, cb) {
            var cbs = this.events[name];
            if (!cbs) {
                cbs = this.events[name] = [];
            }
            cbs.push(cb);
        },

        emit: function (name, evt) {
            each(this.events[name], function (cb) {
                cb(evt);
            });
            if (name === 'error') {
                //Now that the error handler was triggered, remove
                //the listeners, since this broken Module instance
                //can stay around for a while in the registry.
                delete this.events[name];
            }
        }
    };






    context = {
        config: config,
        contextName: contextName,
        registry: registry,
        defined: defined,
        urlFetched: urlFetched,
        defQueue: defQueue,
        Module: Module,
        makeModuleMap: makeModuleMap,
        nextTick: req.nextTick,
        onError: onError,

        /**
         * Set a configuration for the context.
         * @param {Object} cfg config object to integrate.
         */
        configure: function (cfg) {
            //Make sure the baseUrl ends in a slash.
            if (cfg.baseUrl) {
                if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                    cfg.baseUrl += '/';
                }
            }

            //Save off the paths since they require special processing,
            //they are additive.
            var shim = config.shim,
                objs = {
                    paths: true,
                    bundles: true,
                    config: true,
                    map: true
                };

            eachProp(cfg, function (value, prop) {
                if (objs[prop]) {
                    if (!config[prop]) {
                        config[prop] = {};
                    }
                    mixin(config[prop], value, true, true);
                } else {
                    config[prop] = value;
                }
            });

            //Reverse map the bundles
            if (cfg.bundles) {
                eachProp(cfg.bundles, function (value, prop) {
                    each(value, function (v) {
                        if (v !== prop) {
                            bundlesMap[v] = prop;
                        }
                    });
                });
            }

            //Merge shim
            if (cfg.shim) {
                eachProp(cfg.shim, function (value, id) {
                    //Normalize the structure
                    if (isArray(value)) {
                        value = {
                            deps: value
                        };
                    }
                    if ((value.exports || value.init) && !value.exportsFn) {
                        value.exportsFn = context.makeShimExports(value);
                    }
                    shim[id] = value;
                });
                config.shim = shim;
            }

            //Adjust packages if necessary.
            if (cfg.packages) {
                each(cfg.packages, function (pkgObj) {
                    var location, name;

                    pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;

                    name = pkgObj.name;
                    location = pkgObj.location;
                    if (location) {
                        config.paths[name] = pkgObj.location;
                    }

                    //Save pointer to main module ID for pkg name.
                    //Remove leading dot in main, so main paths are normalized,
                    //and remove any trailing .js, since different package
                    //envs have different conventions: some use a module name,
                    //some use a file name.
                    config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                        .replace(currDirRegExp, '')
                        .replace(jsSuffixRegExp, '');
                });
            }

            //If there are any "waiting to execute" modules in the registry,
            //update the maps for them, since their info, like URLs to load,
            //may have changed.
            eachProp(registry, function (mod, id) {
                //If module already has init called, since it is too
                //late to modify them, and ignore unnormalized ones
                //since they are transient.
                if (!mod.inited && !mod.map.unnormalized) {
                    mod.map = makeModuleMap(id);
                }
            });

            //If a deps array or a config callback is specified, then call
            //require with those args. This is useful when require is defined as a
            //config object before require.js is loaded.
            if (cfg.deps || cfg.callback) {
                context.require(cfg.deps || [], cfg.callback);
            }
        },

        makeShimExports: function (value) {
            function fn() {
                var ret;
                if (value.init) {
                    ret = value.init.apply(global, arguments);
                }
                return ret || (value.exports && getGlobal(value.exports));
            }
            return fn;
        },

        makeRequire: function (relMap, options) {
            options = options || {};

            function localRequire(deps, callback, errback) {
                var id, map, requireMod;

                if (options.enableBuildCallback && callback && isFunction(callback)) {
                    callback.__requireJsBuild = true;
                }

                if (typeof deps === 'string') {
                    if (isFunction(callback)) {
                        //Invalid call
                        return onError(makeError('requireargs', 'Invalid require call'), errback);
                    }

                    //If require|exports|module are requested, get the
                    //value for them from the special handlers. Caveat:
                    //this only works while module is being defined.
                    if (relMap && hasProp(handlers, deps)) {
                        return handlers[deps](registry[relMap.id]);
                    }

                    //Synchronous access to one module. If require.get is
                    //available (as in the Node adapter), prefer that.
                    if (req.get) {
                        return req.get(context, deps, relMap, localRequire);
                    }

                    //Normalize module name, if it contains . or ..
                    map = makeModuleMap(deps, relMap, false, true);
                    id = map.id;

                    if (!hasProp(defined, id)) {
                        return onError(makeError('notloaded', 'Module name "' +
                            id +
                            '" has not been loaded yet for context: ' +
                            contextName +
                            (relMap ? '' : '. Use require([])')));
                    }
                    return defined[id];
                }

                //Grab defines waiting in the global queue.
                intakeDefines();

                //Mark all the dependencies as needing to be loaded.
                //标记所有要加载的依赖项
                context.nextTick(function () {
                    //Some defines could have been added since the
                    //require call, collect them.
                    intakeDefines();

                    //makeModuleMap的返回值是一个object.它包含内容具体见该函数的return
                    requireMod = getModule(makeModuleMap(null, relMap));

                    //Store if map config should be applied to this require
                    //call for dependencies.
                    requireMod.skipMap = options.skipMap;

                    requireMod.init(deps, callback, errback, {
                        enabled: true
                    });

                    checkLoaded();
                });

                return localRequire;
            }

            mixin(localRequire, {
                isBrowser: isBrowser,

                /**
                 * Converts a module name + .extension into an URL path.
                 * *Requires* the use of a module name. It does not support using
                 * plain URLs like nameToUrl.
                 */
                toUrl: function (moduleNamePlusExt) {
                    var ext,
                        index = moduleNamePlusExt.lastIndexOf('.'),
                        segment = moduleNamePlusExt.split('/')[0],
                        isRelative = segment === '.' || segment === '..';

                    //Have a file extension alias, and it is not the
                    //dots from a relative path.
                    if (index !== -1 && (!isRelative || index > 1)) {
                        ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                        moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                    }

                    return context.nameToUrl(normalize(moduleNamePlusExt,
                        relMap && relMap.id, true), ext,  true);
                },

                defined: function (id) {
                    return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                },

                specified: function (id) {
                    id = makeModuleMap(id, relMap, false, true).id;
                    return hasProp(defined, id) || hasProp(registry, id);
                }
            });

            //Only allow undef on top level require calls
            if (!relMap) {
                localRequire.undef = function (id) {
                    //Bind any waiting define() calls to this context,
                    //fix for #408
                    takeGlobalQueue();

                    var map = makeModuleMap(id, relMap, true),
                        mod = getOwn(registry, id);

                    removeScript(id);

                    delete defined[id];
                    delete urlFetched[map.url];
                    delete undefEvents[id];

                    //Clean queued defines too. Go backwards
                    //in array so that the splices do not
                    //mess up the iteration.
                    eachReverse(defQueue, function(args, i) {
                        if(args[0] === id) {
                            defQueue.splice(i, 1);
                        }
                    });

                    if (mod) {
                        //Hold on to listeners in case the
                        //module will be attempted to be reloaded
                        //using a different config.
                        if (mod.events.defined) {
                            undefEvents[id] = mod.events;
                        }

                        cleanRegistry(id);
                    }
                };
            }

            return localRequire;
        },

        /**
         * Called to enable a module if it is still in the registry
         * awaiting enablement. A second arg, parent, the parent module,
         * is passed in for context, when this method is overridden by
         * the optimizer. Not shown here to keep code compact.
         */
        enable: function (depMap) {
            var mod = getOwn(registry, depMap.id);
            if (mod) {
                getModule(depMap).enable();
            }
        },

        /**
         * Internal method used by environment adapters to complete a load event.
         * A load event could be a script load or just a load pass from a synchronous
         * load call.
         * @param {String} moduleName the name of the module to potentially complete.
         */
        completeLoad: function (moduleName) {
            var found, args, mod,
                shim = getOwn(config.shim, moduleName) || {},
                shExports = shim.exports;

            takeGlobalQueue();

            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    args[0] = moduleName;
                    //If already found an anonymous module and bound it
                    //to this name, then this is some other anon module
                    //waiting for its completeLoad to fire.
                    if (found) {
                        break;
                    }
                    found = true;
                } else if (args[0] === moduleName) {
                    //Found matching define call for this script!
                    found = true;
                }

                callGetModule(args);
            }

            //Do this after the cycle of callGetModule in case the result
            //of those calls/init calls changes the registry.
            mod = getOwn(registry, moduleName);

            if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                    if (hasPathFallback(moduleName)) {
                        return;
                    } else {
                        return onError(makeError('nodefine',
                            'No define call for ' + moduleName,
                            null,
                            [moduleName]));
                    }
                } else {
                    //A script that does not call define(), so just simulate
                    //the call for it.
                    callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                }
            }

            checkLoaded();
        },

        /**
         * Converts a module name to a file path. Supports cases where
         * moduleName may actually be just an URL.
         * Note that it **does not** call normalize on the moduleName,
         * it is assumed to have already been normalized. This is an
         * internal API, not a public one. Use toUrl for the public API.
         */
        //将一个模块名转为一个文件路径。当模块名是一个url，也支持。
        nameToUrl: function (moduleName, ext, skipExt) {
            var paths, syms, i, parentModule, url,
                parentPath, bundleId,
                pkgMain = getOwn(config.pkgs, moduleName);

            if (pkgMain) {
                moduleName = pkgMain;
            }

            bundleId = getOwn(bundlesMap, moduleName);

            if (bundleId) {
                return context.nameToUrl(bundleId, ext, skipExt);
            }

            //If a colon is in the URL, it indicates a protocol is used and it is just
            //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
            //or ends with .js, then assume the user meant to use an url and not a module id.
            //The slash is important for protocol-less URLs as well as full paths.
            if (req.jsExtRegExp.test(moduleName)) {
                //Just a plain path, not module name lookup, so just return it.
                //Add extension if it is included. This is a bit wonky, only non-.js things pass
                //an extension, this method probably needs to be reworked.
                url = moduleName + (ext || '');
            } else {
                //A module that needs to be converted to a path.
                paths = config.paths;

                syms = moduleName.split('/');
                //For each module name segment, see if there is a path
                //registered for it. Start with most specific name
                //and work up from it.
                for (i = syms.length; i > 0; i -= 1) {
                    parentModule = syms.slice(0, i).join('/');

                    parentPath = getOwn(paths, parentModule);
                    if (parentPath) {
                        //If an array, it means there are a few choices,
                        //Choose the one that is desired
                        if (isArray(parentPath)) {
                            parentPath = parentPath[0];
                        }
                        syms.splice(0, i, parentPath);
                        break;
                    }
                }

                //Join the path parts together, then figure out if baseUrl is needed.
                url = syms.join('/');
                url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
            }

            return config.urlArgs ? url +
                ((url.indexOf('?') === -1 ? '?' : '&') +
                    config.urlArgs) : url;
        },

        //Delegates to req.load. Broken out as a separate function to
        //allow overriding in the optimizer.
        load: function (id, url) {
            req.load(context, id, url);
        },

        /**
         * Executes a module callback function. Broken out as a separate function
         * solely to allow the build system to sequence the files in the built
         * layer in the right sequence.
         *
         * @private
         */
        execCb: function (name, callback, args, exports) {
            return callback.apply(exports, args);
        },

        /**
         * callback for script loads, used to check status of loading.
         *
         * @param {Event} evt the event from the browser for the script
         * that was loaded.
         */
        onScriptLoad: function (evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            if (evt.type === 'load' ||
                (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                //Reset interactive script so a script node is not held onto for
                //to long.
                interactiveScript = null;

                //Pull out the name of the module and the context.
                var data = getScriptData(evt);
                context.completeLoad(data.id);
            }
        },

        /**
         * Callback for script errors.
         */
        onScriptError: function (evt) {
            var data = getScriptData(evt);
            if (!hasPathFallback(data.id)) {
                return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
            }
        }
    };

    context.require = context.makeRequire();
    return context;
}