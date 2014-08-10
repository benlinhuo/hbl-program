/* Do version 2.0 pre
 * creator: kejun (listenpro@gmail.com)
 * 最新更新：2011-7-12
 */

(function(win, doc) {

// 已加载模块
var loaded = {},

// 已加载列表
loadList = {},

// 加载中的模块
loadingFiles = {},

// 内部配置文件
config = {
    // 是否自动加载核心库
    autoLoad: true,

    // 加载延迟
    timeout: 6000,

    // 核心库
    coreLib: ['http://t.douban.com/js/jquery.min.js'],

    /* 模块依赖
     * {
     *  moduleName: {
     *      path: 'URL',
     *      type:'js|css',
     *      requires:['moduleName1', 'fileURL']
     *  }
     * }
     */
    mods: {}
},

//返回最后一个script标签的dom元素
jsSelf = (function() { 
  var files = doc.getElementsByTagName('script'); 
  return files[files.length - 1];
})(),

// 全局模块
globalList = [],

// 外部参数
extConfig,

// domready回调堆栈
readyList = [],

// DOM Ready
isReady = false,

// 模块间的公共数据 
publicData = {},

// 公共数据回调堆栈 
publicDataStack = {},

isArray = function(e) { 
  return e.constructor === Array; 
},

getMod = function(e) {
    var mods = config.mods, mod;
    /*
     * mod分三种情况：1. 当传入的string时，如果已经在config.mods中，直接返回；2. 否则就以path为key，string为value的形式一个对象作为此mod
     * 3. 如果自身传入的就已经是object了，则直接返回该mod即可
     * */
    if (typeof e === 'string') {
        mod = (mods[e])? mods[e] : { path: e };
    } else {
        mod = e;
    }
    return mod;
}

/*
* 注意：其实我们的每一个module都还是通过一个script请求去请求的，没有将module进行合并
*/
load = function(url, type, charset, cb) {
    var wait, n, t, img, 

    done = function() {
      loaded[url] = 1;
      cb && cb(url);
      cb = null;
      win.clearTimeout(wait);
    };

    if (!url) {
        return;
    }
//loaded已加载的模块
    if (loaded[url]) {
        loadingFiles[url] = false;
        if (cb) {
            cb(url);//callback执行的时候是把mod.path作为参数的
        }
        return;
    }
//loadingFiles加载中的模块
    if (loadingFiles[url]) {
        setTimeout(function() {
            load(url, type, charset, cb);
        }, 10);
        return;
    }

    loadingFiles[url] = true;

    wait = win.setTimeout(function() {
    /* 目前延时回调处理，超时后如果有延时回调，执行回调，然后继续等
     * 延时回调的意义是log延时长的URI，这个处理不属于加载器本身的功能移到外部
     * 没有跳过是为了避免错误。
     */
      if (config.timeoutCallback) {
        try {
          config.timeoutCallback(url); 
        } catch(ex) {}
      }
    }, config.timeout);

    t =  type || url.toLowerCase().split(/\./).pop().replace(/[\?#].*/, '');

    if (t === 'js') {
      n = doc.createElement('script');
      n.setAttribute('type', 'text/javascript');
      n.setAttribute('src', url);
      n.setAttribute('async', true);
    } else if (t === 'css') {
      n = doc.createElement('link');
      n.setAttribute('type', 'text/css');
      n.setAttribute('rel', 'stylesheet');
      n.setAttribute('href', url);
    }

    if (charset) {
      n.charset = charset;
    }

    /*
    * css文件是通过image实现请求文件的
    */
    if (t === 'css') {
      img = new Image();
      img.onerror = function() {
        done();
        img.onerror = null;
        img = null;
      }
      img.src = url;
    } else {
      // firefox, safari, chrome, ie9下加载失败触发
      // 如果文件是404, 会比timeout早触发onerror。目前不处理404，只处理超时
      n.onerror = function() {
        done();
        n.onerror = null;
      };

      // ie6~8通过创建vbscript可以识别是否加载成功。
      // 但这样需先测试性加载再加载影响性能。即使没成功加载而触发cb，顶多报错，没必要杜绝这种报错

      // ie6~9下加载成功或失败，firefox, safari, opera下加载成功触发
      n.onload = n.onreadystatechange = function() {
        var url;
        if (!this.readyState ||
            this.readyState === 'loaded' ||
            this.readyState === 'complete') {
          done();
          n.onload = n.onreadystatechange = null;
        }
      };
    }

    //jsSelf是最后一个script标签的dom元素
    jsSelf.parentNode.insertBefore(n, jsSelf);
},

  // 加载依赖论文件(顺序)
  loadDeps = function(deps, cb) {
    var mods = config.mods, 
    id, m, mod, i = 0, len;

    id = deps.join('');
    len = deps.length;

    //表示该依赖文件都已经正常加载，则可以直接执行callback
    if (loadList[id]) {
      cb();
      return;
    }

    function callback() {
      if(!--len) {
        loadList[id] = 1;
        cb();
      }
    }

    /*
    * for循环依次加载deps中的依赖项，每个依赖依次通过load函数加载
    */
    for (; m = deps[i++]; ) {
      mod = getMod(m);//mod过滤
      //表示该模块有模块依赖，则需要先加载对应的依赖项
      if (mod.requires) {
        //是否可以把loadDeps改成arguments.callee
        loadDeps(mod.requires, (function(mod){
              return function(){
              load(mod.path, mod.type, mod.charset, callback);
              };
              })(mod));
      } else {
        load(mod.path, mod.type, mod.charset, callback);
      }
    }
  },

  /*!
   * contentloaded.js
   *
   * Author: Diego Perini (diego.perini at gmail.com)
   * Summary: cross-browser wrapper for DOMContentLoaded
   * Updated: 20101020
   * License: MIT
   * Version: 1.2
   *
   * URL:
   * http://javascript.nwbox.com/ContentLoaded/
   * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
   *
   */

  // @win window reference
  // @fn function reference
  contentLoaded = function(fn) {
    var done = false, top = true, 
    doc = win.document, 
    root = doc.documentElement,
    add = doc.addEventListener ? 'addEventListener' : 'attachEvent',
    rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent',
    pre = doc.addEventListener ? '' : 'on',

    init = function(e) {
      if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
      (e.type == 'load' ? win : doc)[rem](pre + e.type, init, false);
      if (!done && (done = true)) fn.call(win, e.type || e);
    },

    poll = function() {
      try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
      init('poll');
    };

    if (doc.readyState == 'complete') fn.call(win, 'lazy');
    else {
      if (doc.createEventObject && root.doScroll) {
        try { top = !win.frameElement; } catch(e) { }
        if (top) {
          poll();
        }
      }
      doc[add](pre + 'DOMContentLoaded', init, false);
      doc[add](pre + 'readystatechange', init, false);
      win[add](pre + 'load', init, false);
    }
  },

  fireReadyList = function() {
    var i = 0, list;
    if (readyList.length) {
      for(; list = readyList[i++]; ) {
        d.apply(this, list);
      }
    }
  },

/*
 *  1. 加载核心库：coreLib
 *  2. 加载全局库：globalList
 *  3. 处理Do()调用时传入的参数，一般三种情况：
 *     3.1 Do(callback);
 *     3.2 Do('js/tip.js',callback);//参数一可以时文件地址或者模块名
 *     3.3 Do({path: 'js/tip.js', requires:['tip-base.js']}, callback);//inline定义依赖关系
 */
d = function() {
    //或者用args = Array.prototype.slice.call(arguments)
    var args = [].slice.call(arguments), fn, id;

    // 加载核心库
    /*
     * coreLib:需要加载的核心库，如jquery
     * loadList：已经加载的列表
     * loadDeps：按序加载核心库，也许核心库会依赖别的模块，则会按照依赖次序加载
     */
    if (config.autoLoad &&
        !loadList[config.coreLib.join('')]) {
        loadDeps(config.coreLib, function(){
            d.apply(null, args);
        });
        return;
    }

    // 加载全局库
    /*
     * globalList:全局模块
     *
     */
    if (globalList.length > 0 &&
        !loadList[globalList.join('')]) {
        loadDeps(globalList, function(){
            d.apply(null, args);
        });
        return;
    }

    //提取出callback
    if (typeof args[args.length - 1] === 'function' ) {
        fn = args.pop();
    }

    id = args.join('');

    /*
     * 1. 当Do的参数只有callback时，即args.length === 0
     * 2. 或者当需要加载的依赖项已经加载过了
     * 以上两种情况，callback就可以直接执行了
     */
    if ((args.length === 0 || loadList[id]) && fn) {
        fn();
        return;
    }

    //如果需要的依赖项未完全加载时，则可以利用加载依赖项的函数loadDeps加载需要的依赖项，
    // 加载完成后，标记这些依赖项已加载（通过设置loadList［id］= 1），且执行callback
    loadDeps(args, function() {
        loadList[id] = 1;
        fn && fn();
    });
};

/*
* add方法定义模块和模块之间的依赖关系，它不会加载模块，只是添加模块的配置而已
* 这样在使用的时候，可以更简便，直接使用定义的模块名即可（用一个字符串）。只有在使用的时候才会加载文件
* 一般使用add定义模块的时候，如：Do.add('lightBox', {path: '{URL}', type: 'js', requires: ['lightBox-css']});
* 第一个参数是模块名字：第二个是该模块的object
 */
d.add = function(sName, oConfig) {
  if (!sName || !oConfig || !oConfig.path) {
    return;
  }
  config.mods[sName] = oConfig;
};

/*
* Do.delay(2000, callback);
* 从以下源码可以看出，我们只要在使用Do({}, callback)的参数基础上再加上时间作为第一个参数，即构成了delay的参数
*/
d.delay = function() {
  var args = [].slice.call(arguments), delay = args.shift();
  win.setTimeout(function() {
      d.apply(this, args);
      }, delay);
};

//声明了全局模块，后面的队列会默认先加载全局模块。在实际应用中不要滥用，只声明必要的，因为这样会影响一些性能。
d.global = function() {
  var args = isArray(arguments[0])? arguments[0] : [].slice.call(arguments);
  globalList = globalList.concat(args);
};

//如：Do.ready('dialog', callback);
//如果要确保顺利操作页面上的任意结点，最好使用ready方法，让队列在DOMReady后执行，当然这样会比直接用Do延后一些执行。
d.ready = function() {
  var args = [].slice.call(arguments);
  if (isReady) {
    return d.apply(this, args);
  }
  readyList.push(args);//先保存着，等到dom加载完成后，会自动执行readyList队列中的内容
};


/* 使用例子如下：
* Do.css([
 '.dui-dialog .hd h3 { margin:0; }',
 '.dui-dialog-close:link { text-decoration:none; }'
 ].join(''));
*/
d.css = function(s) {
  var css = doc.getElementById('do-inline-css');
  if (!css) {
    css = doc.createElement('style');
    css.type = 'text/css';
    css.id = 'do-inline-css';
    /*css创建的标签style，也是放在script后请求*/
    jsSelf.parentNode.insertBefore(css, jsSelf);
  }

  if (css.styleSheet) {
    css.styleSheet.cssText = css.styleSheet.cssText + s;
  } else {
    css.appendChild(doc.createTextNode(s));
  }
};

//由于文件是异步加载的，所以执行的顺序不是固定的。如果模块间存在数据上的依赖，可以使用setData和getData方法
/*
* Do(function(){
 Do.getData('test', function(value){
 console.log(value); //1000
 });
 });

 Do('slow-js', function(){
 Do.setData('test', 1000);
 });
*/
/*
* 以下的getData和setData拥有publicData和publicDataStack两个，主要是为了无论先执行getData还是setData，都能得到正确的结果。
 * 1. 先setData，再getData。setData后，就设置了publicData［prop］= value。所以在getData的时候，就可以直接获取publicData(prop),并且执行callback，且参数是publicData(prop)
 * 2. 先getData，再setData。因为getData的时候，publicData[prop]还没有值，所以它就把需要执行的callback放到publicDataStack中，等到执行setData时再执行对应的publicDataStack[prop]
*/
d.setData = d.setPublicData = function(prop, value) {
  var cbStack = publicDataStack[prop];//publicDataStack公共数据回调堆栈

  publicData[prop] = value;//publicData模块间的公共数据

  if (!cbStack) {
    return;
  }

  while (cbStack.length > 0) {
    (cbStack.pop()).call(this, value);
  }
};

d.getData = d.getPublicData = function(prop, cb) {
  if (publicData[prop]) {
    cb(publicData[prop]);
    return;
  } 

  if (!publicDataStack[prop]) {
    publicDataStack[prop] = [];
  }

  publicDataStack[prop].push(function(value){
      cb(value);
      });
};

d.setConfig = function(n, v) {
  config[n] = v;
  return d;
};

d.getConfig = function(n) {
  return config[n];
};

win.Do = d;

contentLoaded(function() {
  isReady = true;
  fireReadyList();
});

// 初始外部配置
extConfig = jsSelf.getAttribute('data-cfg-autoload');
if (extConfig) {
  config.autoLoad = (extConfig.toLowerCase() === 'true') ? true : false;
}

extConfig = jsSelf.getAttribute('data-cfg-corelib');
if (extConfig) {
  config.coreLib = extConfig.split(',');
}

})(window, document);

问题1:为什么loadList中的id键名是所有的deps用join(' ')之后的值
问题2:如果是多个依赖项，该怎样？
问题3:问什么getMod是分了这3中情况
问题4:css文件为什么要通过image来请求,之前已经通过创建node了（link）
问题5:为什么定义d＝function(){}，之后又直接定义d.add函数呢？这是什么设计模式

为什么我们J.ready函数是在dom加载完成后，它才会执行的呢？