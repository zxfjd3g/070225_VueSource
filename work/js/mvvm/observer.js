function Observer(data) {
    // 保存数据对象
    this.data = data;
    // 启动对data中数据的监视
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        // 缓存监视器对象
        var me = this;
        // 遍历data中所有属性
        Object.keys(data).forEach(function(key) {
            // 对指定属性设置监视
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val); // 响应式(数据驱动)
    },

    /*
    对data中指定的属性实现数据绑定(劫持)
     */
    defineReactive: function(data, key, val) {
        // 创建一个dep对象   dependency(依赖)
        var dep = new Dep();
        var childObj = observe(val); // 递归调用

        // 给data中的指定属性重新定义get/set
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                if (Dep.target) {
                    dep.depend();
                }
                return val;
            },
            set: function(newVal) {  // 监视data中属性的变化---> 更新界面对应节点
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知订阅者
                dep.notify();
            }
        });
    }
};

/*
监视value对象中的所有属性
 */
function observe(value, vm) {

    if (!value || typeof value !== 'object') {
        return;
    }

    // 创建一个监视器对象
    return new Observer(value);
};


var uid = 0;

function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null;