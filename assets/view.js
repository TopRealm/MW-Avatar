/**
 * ViewAvatar页面的表单验证功能
 */
(function() {
    'use strict';

    function initFormValidation() {
        // 为删除表单添加验证
        var deleteForms = document.querySelectorAll('form');
        deleteForms.forEach(function(form) {
            form.addEventListener('submit', function(e) {
                var reasonInput = form.querySelector('input[name="reason"]');
                var deleteInput = form.querySelector('input[name="delete"]');
                
                // 只对删除表单进行验证
                if (deleteInput && deleteInput.value === 'true' && reasonInput) {
                    var reason = reasonInput.value.trim();
                    if (!reason) {
                        e.preventDefault();
                        alert('请输入删除理由');
                        reasonInput.focus();
                        return false;
                    }
                }
            });
        });
    }

    // 页面加载完成后初始化
    mw.hook('wikipage.content').add(function() {
        // 等待OOUI组件渲染完成
        setTimeout(function() {
            initFormValidation();
        }, 200);
    });

    // 如果页面已经加载完成，直接初始化
    if (document.readyState === 'complete') {
        setTimeout(function() {
            initFormValidation();
        }, 200);
    } else {
        window.addEventListener('load', function() {
            setTimeout(function() {
                initFormValidation();
            }, 200);
        });
    }

    // 监听OOUI ready事件
    mw.hook('ooui.ready').add(function() {
        setTimeout(function() {
            initFormValidation();
        }, 100);
    });

})();
