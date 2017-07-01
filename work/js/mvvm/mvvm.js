function MVVM(options) {
    // 将选项对象保存到vm中
    this.$options = options;
    // 将选项对象中的data保存到vm和data变量中
    var data = this._data = this.$options.data;
    // 缓存vm
    var me = this;
    // 遍历data中所有的属性
    Object.keys(data).forEach(function(key) { // 属性名
        // 对指定属性实现对其代理
        me._proxy(key);
    });

    observe(data, this);

    // 创建一个compile对象(内部会对模板进行编译)
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxy: function(key) {
        // 缓存vm
        var me = this;
        // 给vm对象添加key属性(属性描述符)
        Object.defineProperty(me, key, {
            // 不能重新定义
            configurable: false,
            // 可以枚举
            enumerable: true,
            // 当通过vm读取key属性值时, 从data中获取对应的属性值     代理读操作
            get: function proxyGetter() {
                return me._data[key];
            },
            // 当通过vm修改其key属性值时, 去修改data对应的属性值   代理写操作
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    }
};