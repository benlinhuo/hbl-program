define(function(require, exports, module) {
    var $ = require('jquery');

    module.exports = Spinning;

    function Spinning() {
        this.container = $('#container');  console.log('1111')
        this.icons = this.container.children;
        this.spinnings = [];
    }

    Spinning.prototype.render = function() {  alert('232')
        this._init();
        this._spin();
    }

    Spinning.prototype._init = function() {
        var spinnings = []; alert('333')
        console.log(this.icons, '0')
        this.icons.each(function(k, v) { alert('12')
            var node = $(this);
            node.css({
                'z-Index': 1000,
                'left': '40px',
                'top': k * 50 + random(10)
            }).
            hover(function() {
                node.fadeTo(250, 1).
                    css('z-Index', 1001).
                    css('transform', 'rotate(0deg)');
            }, function() {
                node.fadeTo(250, 0.6).
                    css('z-Index', 1000).
                    css('transform', 'rotate(' + random(360) + ')deg');
            });
        });
    }

    Spinning.prototype._spin = function() {

    }

    function random(x) {
        return Math.random() * x;
    }
    
});