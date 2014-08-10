/**
 * force.js
 * Simple AMD module loader.
 *
 * Author: Leo Deng
 * URL:    https://github.com/myst729/force.js
 */

void function(window, document, undefined) {

  // ES5 strict mode
  "use strict";

  var head = document.getElementsByTagName('head')[0];
  var modules = {};   // map of all registered modules
  var injects = {};   // map of all scripts that have been injected
  var callbacks = {}; // stores the callbacks sequence for future execution
  var anonymous = 0;  // anonymous modules counter

  // Append a script tag into the document head.
  function appendScript(path) {
    var node = document.createElement('script');
    node.type = 'text/javascript';
    node.async = 'true';
    node.src = path + '.js';
    head.appendChild(node);
  }

  // Inject a module.
  function injectModule(id) {
    // Avoid repeated injection.
    if(!injects[id]) {
      injects[id] = true;
      appendScript(id);
    }
  }

  // Register a module.
   /*
   *
   * 注册该模块，即给modules[id]赋值，并且执行该模块自带的callback，传入的参数是该模块所有的依赖。且删除callbacks队列中的该callback
   */
  function registerModule(id, dependencies, callback) {
    // Avoid repeated registration.
    if(!modules[id]) {
      // Register this module by executing the callback with all dependencies as arguments.
      // The callback should return an object with several methods.
      modules[id] = callback.apply(null, dependencies);
      // Remove the callback from sequence.
      delete(callbacks[id]);
    }

  /*
  * 我们理解该加载器的核心源码时，可以根据index.html例子，以及各个模块的引入顺序，自己走一遍index.html的执行
  *
  * 问题1. 当例子为A require B和C，B本身define时又需要依赖D和E，D和E直接define，无依赖项。当我们加载了D和E后（即register后），B的callback又是怎样返回加载的
  * 答：如下两段代码执行callbacks队列中的callback(需注意：比如B依赖于D和E，则D和E的callback一定需要在B之前执行)
  *
  */

  /*
  * 该加载模块器的缺点：
  * 1. 每个模块（用define定义的）都需要通过一个script去请求，无法把多个模块进行合并请求
  * 2. 每执行一次register函数就会循环一次callbacks队列，执行可以执行的callback，比较盲目
  * 3. var app = document.getElementsByTagName('script')[0].getAttribute('data-main');请求方式规定死了。且需要执行的js只有一个入口
  *
  * 优点：
  * 1. 每个模块只需要加载一次就行，即使在很多地方都写了require。核心程序做了控制，加载过的则不再加载。
  * 那思考问题：1.1 某模块已经加载，则在另一个模块中，能否不require就可以直接使用。不可以，因为如下1.2的解释，只有require某个模块后，它的callback执行时才会有该模块的返回值作为参数，否则没有。
  *           1.2 define('forces/dom', ['forces/query', 'forces/string'], function(query, string) {...此处就可以直接用query变量引用依赖项'forces/query'中的模块函数})
  *           为什么该callback中可以直接使用该模块的返回值
  *           因为我们在register某个模块的时候，会让modules[id]=callback执行的结果，在给callback（当该callback执行是有依赖项的时候，无依赖项就不需要考虑callback的参数）执行时，
  *              传入的是对应的modules。因为使用deps组织该参数时，deps.push(modules[callbacks[key][i]]);
  *
  */


    // Iterate the callbacks sequence to see whether any callback meets the condition to run.
    loop: for(var key in callbacks) {
      //key表示callbacks的模块名或者叫模块id
      var deps = [];
      // Iterate all dependencies of this callback.
      //以下这个for是为了保证某个模块的callback执行时，它所依赖的模块都已经加载
      for(var i = 2, l = callbacks[key].length; i < l; i++) {
        // If all dependencies are registered, construct the callback arguments.
        // Otherwise skip to next callback in the sequence.
        if(modules[callbacks[key][i]]) {
          deps.push(modules[callbacks[key][i]]);
        } else {
          continue loop;
        }
      }


      /*
      * define定义的模块，它的callback必须通过register开始的代码执行callback，因为它不仅要执行callback，还需要注册module，即modules[id] = callback.apply(null, dependencies);
      * require的callback，直接执行就好了，因为它自身不是什么模块
      *
      */
      // Arguments are ready, execute the callback.
      if(callbacks[key][0]) {
        //callbacks[key][0] == true，表示是通过define加到队列中的callback
        // Module definition, just register the module.
        registerModule(key, deps, callbacks[key][1]);
      } else {
        //callbacks[key][0] == false，表示是通过require加到队列中的callback
        // Require modules in order to execute a callback.
        callbacks[key][1].apply(null, deps);
        // Remove the callback from sequence.
        delete(callbacks[key]);
      }
    }
  }

  /**
   * @description Define a module that can be used later.
   * @param {String} moduleId Absolute path to the module file (without file name extension).
   * @param {Array} dependencies IDs of the dependent modules.
   * @param {Function} factory A factory function that would be executed after all modules are ready, and returns definition of the module. Its parameter list must be coincident with the dependencies.
   */

  /*
  * 1. 引入该引入的模块：define中callback的id是定义的该模块名。对于require中加载模块依赖的callback的id，是自己命名的“reqire”＋（1，2...）
  * 2. define本模块，即registerModule
  */
  function defineModule(id, dependencies, callback) {
    // Check whether all dependencies are registered.
    //本部分是用来处理define中引入依赖的部分，同require
    for(var i = 0, l = dependencies.length; i < l; i++) {
      if(!modules[dependencies[i]]) {
        // If any dependency is not registered, store the callback and dependencies for future execution.
        callbacks[id] = [true, callback].concat(dependencies);

        // Try to inject all dependencies again and return.
        for(i = 0; i < l; i++) {
          injectModule(dependencies[i]);
        }
        return;
      }
    }

    // Register this module only if all dependencies are registered.
    //(在所有依赖的模块都被注册以后，才注册该模块)
    //因为只有所有模块被注册以后，该模块的callback才会被执行，该模块自身才能正常的被注册
    registerModule(id, dependencies, callback);
  }

  /**
   * @description Require dependency modules and do something immediately.
   * @param {Array} dependencies IDs of the dependent modules.
   * @param {Function} factory A callback function that would be executed after all modules are ready. Its parameter list must be coincident with the dependencies.
   */
  function requireModule(dependencies, callback) {
    // Check whether all dependencies are registered.
    for(var i = 0, l = dependencies.length; i < l; i++) {
      if(!modules[dependencies[i]]) {
        // If any dependency is not registered, store the callback and dependencies for future execution.
        var id = 'require/' + (anonymous++);
        callbacks[id] = [false, callback].concat(dependencies);

        // Inject all dependencies and return.
        for(i = 0; i < l; i++) {
          injectModule(dependencies[i]);
        }
        return;
      }
    }

    // Execute the callback only if all dependencies are registered.
    callback();
  }

  // Initialize.
  function init() {
    // Compatible with AMD API
    defineModule.amd = {};

    // Expose define and require method to the window object.
    window.define = defineModule;
    window.require = requireModule;

    // Load app script.
    var app = document.getElementsByTagName('script')[0].getAttribute('data-main');
    appendScript(app);
  }

  // Go!
  init();

}(window, document);