    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; i < ary.length; i++) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                // If at the start, or previous value is still ..,
                // keep them so that when converted to a path it may
                // still work when converted to a path, even though
                // as an ID it is less than ideal. In larger point
                // releases, may be better to just kick out an error.
                if (i === 0 || (i == 1 && ary[2] === '..') || ary[i - 1] === '..') {
                    continue;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }



    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @param {Boolean} applyMap apply the map config to the value. Should
     * only be done if this normalization is for a dependency ID.
     * @returns {String} normalized name
     */
     //将一个相对的模块名标准化为一个被匹配的路径的真实模块名
    function normalize(name, baseName, applyMap) {
        var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
            foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
            baseParts = (baseName && baseName.split('/')),
            map = config.map,
            starMap = map && map['*'];

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            trimDots(name);
            name = name.join('/');
        }

        //Apply map config if available.
        if (applyMap && map && (baseParts || starMap)) {
            nameParts = name.split('/');

            outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join('/');

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                        //baseName segment has config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = getOwn(mapValue, nameSegment);
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break outerLoop;
                            }
                        }
                    }
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                    foundStarMap = getOwn(starMap, nameSegment);
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        // If the name points to a package's name, use
        // the package main instead.
        pkgMain = getOwn(config.pkgs, name);

        return pkgMain ? pkgMain : name;
    }


    //移除script请求，且这种script请求的属性data-requiremodule === name && data-requirecontext === context.contextName
    function removeScript(name) {
        if (isBrowser) {
            each(scripts(), function (scriptNode) {
                if (scriptNode.getAttribute('data-requiremodule') === name &&
                    scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                    scriptNode.parentNode.removeChild(scriptNode);
                    return true;
                }
            });
        }
    }

    function hasPathFallback(id) {
        var pathConfig = getOwn(config.paths, id);
        if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
            //Pop off the first array value, since it failed, and
            //retry
            pathConfig.shift();
            context.require.undef(id);

            //Custom require that does not do map translation, since
            //ID is "absolute", already mapped/resolved.
            context.makeRequire(null, {
                skipMap: true
            })([id]);

            return true;
        }
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

        /**
     * Creates a module mapping that includes plugin prefix, module
     * name, and path. If parentModuleMap is provided it will
     * also normalize the name via require.normalize()
     *
     * @param {String} name the module name
     * @param {String} [parentModuleMap] parent module map
     * for the module name, used to resolve relative names.
     * @param {Boolean} isNormalized: is the ID already normalized.
     * This is true if this call is done for a define() module ID.
     * @param {Boolean} applyMap: apply the map config to the ID.
     * Should only be true if this map is for a dependency.
     *
     * @returns {Object}
     */
     // 使模块匹配包含插件前缀，模块名字及路径。如果parentModuleMap提供了，也可以通过require.normalize()来标准化该模块
    function makeModuleMap( , parentModuleMap, isNormalized, applyMap) {
        var url, pluginModule, suffix, nameParts,
            prefix = null,
            parentName = parentModuleMap ? parentModuleMap.name : null,
            originalName = name,
            isDefine = true,
            normalizedName = '';

        //If no name, then it means it is a require call, generate an
        //internal name.
        if (!name) {
            isDefine = false;
            name = '_@r' + (requireCounter += 1);
        }

        nameParts = splitPrefix(name);
        prefix = nameParts[0];
        name = nameParts[1];

        if (prefix) {
            prefix = normalize(prefix, parentName, applyMap);
            pluginModule = getOwn(defined, prefix);
        }

        //Account for relative paths if there is a base name.
        if (name) {
            if (prefix) {
                if (pluginModule && pluginModule.normalize) {
                    //Plugin is loaded, use its normalize method.
                    normalizedName = pluginModule.normalize(name, function (name) {
                        return normalize(name, parentName, applyMap);
                    });
                } else {
                    // If nested plugin references, then do not try to
                    // normalize, as it will not normalize correctly. This
                    // places a restriction on resourceIds, and the longer
                    // term solution is not to normalize until plugins are
                    // loaded and all normalizations to allow for async
                    // loading of a loader plugin. But for now, fixes the
                    // common uses. Details in #1131
                    normalizedName = name.indexOf('!') === -1 ?
                        normalize(name, parentName, applyMap) :
                        name;
                }
            } else {
                //A regular module.
                normalizedName = normalize(name, parentName, applyMap);

                //Normalized name may be a plugin ID due to map config
                //application in normalize. The map config values must
                //already be normalized, so do not need to redo that part.
                nameParts = splitPrefix(normalizedName);
                prefix = nameParts[0];
                normalizedName = nameParts[1];
                isNormalized = true;

                url = context.nameToUrl(normalizedName);
            }
        }

        //If the id is a plugin id that cannot be determined if it needs
        //normalization, stamp it with a unique ID so two matching relative
        //ids that may conflict can be separate.
        suffix = prefix && !pluginModule && !isNormalized ?
            '_unnormalized' + (unnormalizedCounter += 1) :
            '';

        return {
            prefix: prefix,
            name: normalizedName,
            parentMap: parentModuleMap,
            unnormalized: !!suffix,
            url: url,
            originalName: originalName,
            isDefine: isDefine,
            id: (prefix ?
                prefix + '!' + normalizedName :
                normalizedName) + suffix
        };
    }



    function getModule(depMap) {
        var id = depMap.id,
            mod = getOwn(registry, id);

        if (!mod) {
            mod = registry[id] = new context.Module(depMap);
        }

        return mod;
    }


    function on(depMap, name, fn) {
        var id = depMap.id,
            mod = getOwn(registry, id);

        if (hasProp(defined, id) &&
            (!mod || mod.defineEmitComplete)) {
            if (name === 'defined') {
                fn(defined[id]);
            }
        } else {
            mod = getModule(depMap);
            if (mod.error && name === 'error') {
                fn(mod.error);
            } else {
                mod.on(name, fn);
            }
        }
    }

    function onError(err, errback) {
        var ids = err.requireModules,
            notified = false;

        if (errback) {
            errback(err);
        } else {
            each(ids, function (id) {
                var mod = getOwn(registry, id);
                if (mod) {
                    //Set error on module, so it skips timeout checks.
                    mod.error = err;
                    if (mod.events.error) {
                        notified = true;
                        mod.emit('error', err);
                    }
                }
            });

            if (!notified) {
                req.onError(err);
            }
        }
    }


    /**
     * Internal method to transfer globalQueue items to this context's
     * defQueue.
     */
    function takeGlobalQueue() {
        //Push all the globalDefQueue items into the context's defQueue
        if (globalDefQueue.length) {
            //Array splice in the values since the context code has a
            //local var ref to defQueue, so cannot just reassign the one
            //on context.
            apsp.apply(defQueue,
                [defQueue.length, 0].concat(globalDefQueue));
            globalDefQueue = [];
        }
    }

//registry和enabledRegistry保存的都是等待队列中的module
 function cleanRegistry(id) {
        //Clean up machinery used for waiting modules.
        delete registry[id];
        delete enabledRegistry[id];
}   


    function breakCycle(mod, traced, processed) {
        var id = mod.map.id;

        if (mod.error) {
            mod.emit('error', mod.error);
        } else {
            traced[id] = true;
            each(mod.depMaps, function (depMap, i) {
                var depId = depMap.id,
                    dep = getOwn(registry, depId);

                //Only force things that have not completed
                //being defined, so still in the registry,
                //and only if it has not been matched up
                //in the module already.
                if (dep && !mod.depMatched[i] && !processed[depId]) {
                    if (getOwn(traced, depId)) {
                        mod.defineDep(i, defined[depId]);
                        mod.check(); //pass false?
                    } else {
                        breakCycle(dep, traced, processed);
                    }
                }
            });
            processed[id] = true;
        }
    }  




    function checkLoaded() {
        var err, usingPathFallback,
            waitInterval = config.waitSeconds * 1000,
        //It is possible to disable the wait interval by using waitSeconds of 0.
            expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
            noLoads = [],
            reqCalls = [],
            stillLoading = false,
            needCycleCheck = true;

        //Do not bother if this call was a result of a cycle break.
        if (inCheckLoaded) {
            return;
        }

        inCheckLoaded = true;

        //Figure out the state of all the modules.
        eachProp(enabledRegistry, function (mod) {
            var map = mod.map,
                modId = map.id;

            //Skip things that are not enabled or in error state.
            if (!mod.enabled) {
                return;
            }

            if (!map.isDefine) {
                reqCalls.push(mod);
            }

            if (!mod.error) {
                //If the module should be executed, and it has not
                //been inited and time is up, remember it.
                if (!mod.inited && expired) {
                    if (hasPathFallback(modId)) {
                        usingPathFallback = true;
                        stillLoading = true;
                    } else {
                        noLoads.push(modId);
                        removeScript(modId);
                    }
                } else if (!mod.inited && mod.fetched && map.isDefine) {
                    stillLoading = true;
                    if (!map.prefix) {
                        //No reason to keep looking for unfinished
                        //loading. If the only stillLoading is a
                        //plugin resource though, keep going,
                        //because it may be that a plugin resource
                        //is waiting on a non-plugin cycle.
                        return (needCycleCheck = false);
                    }
                }
            }
        });

        if (expired && noLoads.length) {
            //If wait time expired, throw error of unloaded modules.
            err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
            err.contextName = context.contextName;
            return onError(err);
        }

        //Not expired, check for a cycle.
        if (needCycleCheck) {
            each(reqCalls, function (mod) {
                breakCycle(mod, {}, {});
            });
        }

        //If still waiting on loads, and the waiting load is something
        //other than a plugin resource, or there are still outstanding
        //scripts, then just try back later.
        if ((!expired || usingPathFallback) && stillLoading) {
            //Something is still waiting to load. Wait for it, but only
            //if a timeout is not already in effect.
            if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                checkLoadedTimeoutId = setTimeout(function () {
                    checkLoadedTimeoutId = 0;
                    checkLoaded();
                }, 50);
            }
        }

        inCheckLoaded = false;
    }  


    function callGetModule(args) {
        //Skip modules already defined.
        if (!hasProp(defined, args[0])) {
            getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
        }
    }


    function removeListener(node, func, name, ieName) {
        //Favor detachEvent because of IE9
        //issue, see attachEvent/addEventListener comment elsewhere
        //in this file.
        if (node.detachEvent && !isOpera) {
            //Probably IE. If not it will throw an error, which will be
            //useful to know.
            if (ieName) {
                node.detachEvent(ieName, func);
            }
        } else {
            node.removeEventListener(name, func, false);
        }
    }


        /**
     * Given an event from a script node, get the requirejs info from it,
     * and then removes the event listeners on the node.
     * @param {Event} evt
     * @returns {Object}
     */
    function getScriptData(evt) {
        //Using currentTarget instead of target for Firefox 2.0's sake. Not
        //all old browsers will be supported, but this one was easy enough
        //to support and still makes sense.
        var node = evt.currentTarget || evt.srcElement;

        //Remove the listeners once here.
        removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
        removeListener(node, context.onScriptError, 'error');

        return {
            node: node,
            id: node && node.getAttribute('data-requiremodule')
        };
    }



    function intakeDefines() {
        var args;

        //Any defined modules in the global queue, intake them now.
        takeGlobalQueue();

        //Make sure any remaining defQueue items get properly processed.
        while (defQueue.length) {
            args = defQueue.shift();
            if (args[0] === null) {
                return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
            } else {
                //args are id, deps, factory. Should be normalized by the
                //define() function.
                callGetModule(args);
            }
        }
    }
  
