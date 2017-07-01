function Compile(el, vm) {
    // 保存vm
    this.$vm = vm;
    // 保存el元素对象
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        // 取出el中所有的子节点, 添加到一个新建fragment对象中
        this.$fragment = this.node2Fragment(this.$el);
        // 编译fragment中所有子节点
        this.init();
        // 将fragment(其所有子节点)添加到el中
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(),
          child;

        // 将原生节点拷贝到fragment
        /*while (child = el.firstChild) { // 在遍历过程中会更新界面
            fragment.appendChild(child);
        }*/
        var htmlStr = el.innerHTML
        el.innerHTML = ''

        // 创建一个div, 插入htmlStr
        var div = document.createElement('div')
        div.innerHTML = htmlStr

        // 取出div中所有孩子添加到fragment
        while (child = div.firstChild) { // 在遍历过程中不会更新界面
            fragment.appendChild(child);
        }

        // 返回fragment
        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    /*
    编译el的所有子节点(任意层次)
     */
    compileElement: function(el) {
        // 得到所有的子点
        var childNodes = el.childNodes,
            me = this;

        // 编译所有子节点
        [].slice.call(childNodes).forEach(function(node) {
            // 得到节点的文本
            var text = node.textContent;
            // 用来匹配表达式的正则对象
            var reg = /\{\{(.*)\}\}/;
            // 如果是元素节点
            if (me.isElementNode(node)) {
                // 编译节点的指令属性
                me.compile(node);
            // 如果是一个表达式文本节点
            } else if (me.isTextNode(node) && reg.test(text)) {
                // 编译这个文本节点
                me.compileText(node, RegExp.$1); // 表达式中表达式串: name/wife.name
            }

            // 如果还有子节点
            if (node.childNodes && node.childNodes.length) {
                // 递归调用: 实现了对任意层次节点的编译
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        // 得到所有的属性节点
        var nodeAttrs = node.attributes,
            me = this;

        // 遍历属性节点
        [].slice.call(nodeAttrs).forEach(function(attr) {
            // 得到属性名  v-on:click
            var attrName = attr.name;
            // 判断是否是指令属性
            if (me.isDirective(attrName)) {
                // 得到节点的值(表达式): 'test'
                var exp = attr.value;
                // 从属性名中取出指令名: on:click
                var dir = attrName.substring(2);
                // 是否是事件指令
                if (me.isEventDirective(dir)) {
                    // 处理这个事件指令
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                // 普通指令
                } else {
                    // 处理这个普通指令: 根据指令名(text/html/class/model)来确定处理的方法
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        // 调用编译工具对象来编译
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    // 解析: v-text/{{}}
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    // 解析: v-html
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },
    // 解析: v-model
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },
    // 解析: v-class
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    /*
     exp: name/wife.name
     dir: text/html/class/model
     */
    bind: function(node, vm, exp, dir) {
        // 得到对应的用于更新节点的方法
        var updaterFn = updater[dir + 'Updater'];

        //执行更新节点的方法
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        // 得到对应的事件名:  click
        var eventType = dir.split(':')[1],
          // 从methods中取出对应的事件回调函数: function test(){}
            fn = vm.$options.methods && vm.$options.methods[exp];
        // 如果都存在
        if (eventType && fn) {
            // 给节点绑定指定事件名和回调函数的DOM事件监听
            node.addEventListener(eventType, fn.bind(vm), false); // 绑定回调函数中的this为vm
        }
    },

    /*
    根据表达式串得到vm中对应的属性值
     */
    _getVMVal: function(vm, exp) { // name| wife.name
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

/*
包含所有更新节点方法的对象
 */
var updater = {

    // 更新节点的textContent属性:  v-text/{{}}
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    // 更新节点的innerHTML属性: v-html
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    // 更新节点的class属性:  v-class
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        if(className.length>0) {
            node.className = className + ' ' + value;
        } else {
            node.className = value;
        }
    },

    // 更新节点的value属性:   v-model
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};