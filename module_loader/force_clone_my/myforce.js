(function(W, D){
    var injects = {};//用于表示某模块是否被请求过
    var modules = {};//register过的模块
    var callbacks = {};//callback队列
    var requireCount = 0;//用于计数require个数

    function loadModule(path) {
        var head = document.getElementByTagName('head')[0],
            node = document.createElement('script');
        node.type = 'text/javascript';
        node.async = true;
        node.src = path + '.js';//所以我们需要引入的时候，把对应的路径加上，相对当前的路径
        head.appendChild(node);
    }

    //id表示模块名
    function injectModule(id) {
        if (!injects[id]) {
            injects[id] = true;//表示已经加载过该模块了
            loadModule(id);
        }
    }

    //注册模块：需要它的所有依赖项都加载，且callback也执行完毕
    //直接调用该函数，表示此时就应该register该模块，不需要判断
    function registerModule(id, dependencies, callback) {
        if (!modules[id]) {
            //当通过defineModule函数调用registerModule时，此种情况，一般依赖项都是空数组，即无依赖项，但是通过以下的代码直接调用，会把dependencies转化为modules执行
            modules[id] = callback.apply(null, dependencies);
            delete callbacks[id];
        }

        //循环执行callbacks队列
        loop: for (var key in callbacks) {
            var deps = [];
            for (var j = 2; j < callbacks[key].length; j++) {
                if (modules[callbacks[key][j]]) {
                    deps.push(modules[callbacks[key][j]]);
                } else {
                    continue loop;
                }
            }
            if (callbacks[key][0]) {
                registerModule(key, deps, callbacks[key][1]);
            } else {
                callbacks[key][1].apply(null, deps);
                delete callbacks[key];
            }
        }
    }

    function requireModule(dependencies, callback) {
        //判断是不是所有的dependencies都已经register
        for (var i = 0, l = dependencies.length; i < l; i++) {
            //只要有一个依赖项没有加载，则callback就无法执行
            if (!modules[dependencies[i]]) {
                //加入callbacks队列
                var id = 'require/' + (++requireCount);
                callbacks[id] = [false, callback].concat(dependencies);
                //加载所有的dependencies，加载过的不再加载
                for (var j = 0; j < l; j++) {
                    injectModule(dependencies[j]);
                }
                return;
            }
        }
        callback();
    }

    function defineModule(id, dependencies, callback) {
        for (var i = 0, l = dependencies.length; i < l; i++) {
            if (!modules[dependencies[i]]) {
                callbacks[id] = [true, callback].concat(dependencies);
                for (var j = 0; j < l; j++) {
                    injectModule((dependencies[j]));
                }
                return;
            }
        }
        registerModule(id, dependencies, callback);
    }

    (function init() {

        W.require = requireModule;
        W.define = defineModule;
        //
        var needLoader = document.getElementByTagName('script')[0].getAttribute('data-main');
        loadModule(needLoader);
    })();

})(window, document);