/****************************************************************
 * 		 支持AMD,CMD模块加载方式
 * 		 @by Aaron
 *          	 github:https://github.com/JsAaron/aaronRequire
 *          	 blog:http://www.cnblogs.com/aaronjs/
 *****************************************************************/
;(function(r) {
    if (typeof module === "object" && typeof require === "function") {
        module.exports.require = r.require;
        module.exports.define = r.define;
    } else {
        require = r.require;
        define  = r.define;
    }
})(function() {

        var objproto = Object.prototype,
            objtoString   = objproto.toString,
            arrproto      = Array.prototype,
            nativeForEach = arrproto.forEach,
            modules       = {},
            pushStack     = {};

        function each(obj, callback, context) {
            if (obj == null) return;
            //如果支持本地forEach方法,并且是函数
            if (nativeForEach && obj.forEach === nativeForEach) {
                obj.forEach(callback, context);
            } else if (obj.length === +obj.length) {
                //for循环迭代
                for (var i = 0, l = obj.length; i < l; i++) {
                    if (callback.call(context, obj[i], i, obj) === breaker) return;
                }
            }
        };

        function isFunction(it) {
            return objtoString.call(it) === '[object Function]';
        }

        function isArray(it) {
            return objtoString.call(it) === '[object Array]';
        }

        //导入模块
        var exp = {
            require: function(id, callback) {
                //数组形式
                //require(['domReady', 'App'], function(domReady, app) {});
                if (isArray(id)) {
                    if (id.length > 1) {
                        return makeRequire(id, callback);
                    }
                    id = id[0];
                }

                //以下保证id就是单个的模块，而非模块数组
                if (!modules[id]) {
                    throw "module " + id + " not found";
                }

                if (callback) {
                    var module = build(modules[id]);
                    callback(module)
                    return module;
                } else {
                    if (modules[id].factory) {
                        return build(modules[id]);
                    }
                    return modules[id].exports;
                }
            },
            //定义模块
            //主要只是给modules[id]赋值而已，其他什么都不做。至于说该模块定义需要的依赖模块的执行，以及该模块的callback都没在该函数中执行。
            // 所以它是在用到该模块的时候才会去执行，也许是所谓的seajs中的“懒”执行，而requirejs是预执行
            define: function(id, deps, factory, post) { //模块名,依赖列表,模块本身
                if (modules[id]) {
                    throw "module " + id + " 模块已存在!";
                }
                //存在依赖导入
                if (arguments.length > 2) {
                    modules[id] = {
                        id: id,
                        deps: deps,
                        factory: factory
                    };
                    //后加载
                    post && exp.require(id, function(exp) {
                        post(exp)
                    })
                } else {
                    /*
                    * 处理这样的情况：
                    * define('b',function(){
                     //执行代码
                     return 'bbbbbbbbbb'
                     });
                    * 无依赖项
                    * */
                    factory = deps;
                    modules[id] = {
                        id: id,
                        factory: factory
                    };
                }
            }
        }

        //解析依赖关系
        function parseDeps(module) {
            var deps = module['deps'],
                temp = [];
            each(deps, function(id, index) {
                temp.push(build(modules[id]))
            })
            return temp;
        }

        function build(module) {
            var depsList, existMod,
                factory = module['factory'],
                id = module['id'];

            if (existMod = pushStack[id]) { //去重复执行，只要pushStack[id]不为NULL，则表示已经执行过了，则不再执行，直接返回即可
                return existMod;
            }

            //接口点，将数据或方法定义在其上则将其暴露给外部调用。
            //初始化当前module的接口
            module.exports = {};

            //去重
            delete module.factory;

            if (module['deps']) {
                //依赖数组列表
                /*
                    define('c', ['a', 'b'], function(a, b) {
                        console.log(a, '1111111');
                        console.log(b, '2222222');
                        return 'cccccccc';
                    });
                    以上因为依赖于['a', 'b']，将通过函数parseDeps()将每个依赖模块的最后return结果存储，即depsList内容
                    depsList作为参数可供callback执行使用，其时，此时的depsList就是[a,b]
                */
                depsList = parseDeps(module);
                module.exports = factory.apply(module, depsList);
            } else {
                // exports 支持直接 return 或 modulejs.exports 方式
                // 返回的是callback执行的结果，如返回一个函数或对象，只不过为了兼容CMD方式，用exports包装了下
                /* 例：
                    define('a', function() {
                        return 'aaaaaa';
                    });
                    执行后，module.exports='aaaaaa';//等于return后面的内容
                */
                /*
                define('c', function(require, exports, module) {
                    var a = require('a')
                    var b = require('b');
                    console.log(a,b)
                    //执行代码
                    return 'ccccccccc'
                });
                CMD的写法：此种方案：一定是将依赖模块的requrie放到callback中的。
                */
                module.exports = factory(exp.require, module.exports, module) || module.exports;
            }

            pushStack[id] = module.exports;

            return module.exports;
        }

        //解析require模块
        //当依赖的模块个数>=2的时候，使用该函数处理
        function makeRequire(ids, callback) {
            var r = ids.length,
                shim = [];
            each(ids, function(name) {
                // shim[name] = build(modules[name]);
                shim.push(build(modules[name]));
            })
            if (callback) {
                // callback.call(null, shim);
                callback.apply(null, shim);
            } else {
                shim = null;
            }
        }

        return exp;
    }());


define('a', function() {
    return 'aaaaaa';
});

define('b', function() {
    return 'bbbbbbbbbb';
});

define('c', ['a', 'b'], function(a, b) {
    console.log(a, '1111111');
    console.log(b, '2222222');
    return 'cccccccc';
});

// require('c', function(c) {
//     console.log(c);
// });

//#####################################################################################
//以下输出结果：
/*
aaaaaa 1111111 
bbbbbbbbbb 2222222 

原因是：当我们引入c模块的时候，会自动载入a和b模块，因为引入c模块的require没有callback，
所以会自动执行define的c模块，即c模块的callback
*/
// require('c');


//#####################################################################################
//以下会执行makeRequire函数
/*
执行结果：
aaaaaa require21 
bbbbbbbbbb require22 

源码有bug，总共改了makeRequire函数中3个地方，原先的shim是{}。
按照原先的代码，执行结果如下：
Object {a: "aaaaaa", b: "bbbbbbbbbb"} "require21" 
undefined "require22" 
这是有问题的
*/
require(['a', 'b'], function(a, b) {
    console.log(a, 'require21');
    console.log(b, 'require22');
});



