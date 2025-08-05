/**
 * 用户建议功能实现
 * 为ViewAvatar页面的用户名输入框添加下拉建议功能
 */
(function() {
    'use strict';

    var api = new mw.Api();
    var currentInput = null;
    var suggestionsContainer = null;
    var selectedIndex = -1;
    var suggestions = [];

    function createSuggestionsContainer() {
        if (suggestionsContainer) {
            return suggestionsContainer;
        }
        
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'suggestions';
        suggestionsContainer.style.display = 'none';
        
        return suggestionsContainer;
    }

    function showSuggestions(inputElement, users) {
        hideSuggestions();
        
        if (!users || users.length === 0) {
            return;
        }

        suggestions = users;
        selectedIndex = -1;
        
        var container = createSuggestionsContainer();
        container.innerHTML = '';
        
        users.forEach(function(user, index) {
            var suggestion = document.createElement('div');
            suggestion.className = 'suggestion';
            suggestion.textContent = user.name;
            suggestion.addEventListener('click', function() {
                selectSuggestion(user.name);
            });
            container.appendChild(suggestion);
        });
        
        // 将建议容器插入到输入框的父容器中
        var parentElement = inputElement.closest('.oo-ui-fieldLayout');
        if (parentElement) {
            parentElement.style.position = 'relative';
            parentElement.appendChild(container);
            container.style.display = 'block';
        }
    }

    function hideSuggestions() {
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
        selectedIndex = -1;
    }

    function selectSuggestion(username) {
        if (currentInput) {
            // 对于OOUI组件，需要通过其widget来设置值
            var widget = OO.ui.infuse(currentInput.closest('.oo-ui-widget'));
            if (widget && widget.setValue) {
                widget.setValue(username);
            } else {
                currentInput.value = username;
                // 触发input事件以确保组件更新
                var event = new Event('input', { bubbles: true });
                currentInput.dispatchEvent(event);
            }
        }
        hideSuggestions();
    }

    function updateSelection(direction) {
        if (!suggestionsContainer || suggestions.length === 0) {
            return;
        }

        var suggestionElements = suggestionsContainer.querySelectorAll('.suggestion');
        
        // 移除当前选中状态
        if (selectedIndex >= 0 && selectedIndex < suggestionElements.length) {
            suggestionElements[selectedIndex].classList.remove('selected');
        }
        
        // 更新选中索引
        if (direction === 'down') {
            selectedIndex = (selectedIndex + 1) % suggestions.length;
        } else if (direction === 'up') {
            selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
        }
        
        // 添加新的选中状态
        if (selectedIndex >= 0 && selectedIndex < suggestionElements.length) {
            suggestionElements[selectedIndex].classList.add('selected');
        }
    }

    function searchUsers(query) {
        if (!query || query.length < 2) {
            hideSuggestions();
            return;
        }

        api.get({
            action: 'query',
            list: 'allusers',
            auprefix: query,
            aulimit: 10,
            format: 'json'
        }).then(function(data) {
            var users = [];
            if (data.query && data.query.allusers) {
                users = data.query.allusers;
            }
            
            if (currentInput && document.activeElement === currentInput) {
                showSuggestions(currentInput, users);
            }
        }).catch(function(error) {
            console.error('用户搜索失败:', error);
            hideSuggestions();
        });
    }

    function initUserSuggest() {
        // 查找用户名输入框 - 需要找到OOUI渲染的实际input元素
        var userInputWidget = document.querySelector('#user');
        var userInput = null;
        
        if (userInputWidget) {
            // 对于OOUI TextInputWidget，实际的input元素在其内部
            userInput = userInputWidget.querySelector('input') || userInputWidget;
        }
        
        if (!userInput) {
            // 如果没找到，稍后重试
            setTimeout(initUserSuggest, 500);
            return;
        }

        currentInput = userInput;
        var searchTimeout;

        // 输入事件处理
        userInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            var query = e.target.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(function() {
                    searchUsers(query);
                }, 300);
            } else {
                hideSuggestions();
            }
        });

        // 键盘事件处理
        userInput.addEventListener('keydown', function(e) {
            if (!suggestionsContainer || suggestionsContainer.style.display === 'none') {
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    updateSelection('down');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    updateSelection('up');
                    break;
                case 'Enter':
                    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                        e.preventDefault();
                        selectSuggestion(suggestions[selectedIndex].name);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    hideSuggestions();
                    break;
            }
        });

        // 失去焦点时隐藏建议
        userInput.addEventListener('blur', function() {
            // 延迟隐藏，以便点击建议时能正常工作
            setTimeout(hideSuggestions, 200);
        });

        // 获得焦点时，如果有值则重新搜索
        userInput.addEventListener('focus', function() {
            var query = userInput.value.trim();
            if (query.length >= 2) {
                searchUsers(query);
            }
        });
    }

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
            initUserSuggest();
            initFormValidation();
        }, 200);
    });

    // 如果页面已经加载完成，直接初始化
    if (document.readyState === 'complete') {
        setTimeout(function() {
            initUserSuggest();
            initFormValidation();
        }, 200);
    } else {
        window.addEventListener('load', function() {
            setTimeout(function() {
                initUserSuggest();
                initFormValidation();
            }, 200);
        });
    }

    // 监听OOUI ready事件
    mw.hook('ooui.ready').add(function() {
        setTimeout(function() {
            initUserSuggest();
            initFormValidation();
        }, 100);
    });

})();
