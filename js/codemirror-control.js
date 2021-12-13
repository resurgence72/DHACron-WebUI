$(document).ready(function () {
    var configActive = $('#config-active');
    var button = $('#save-config');
    var oldConfig = "";
    var globalMd5 = "";

    function diffMode(left, right) {
        var value, orig1, orig2, dv, panes = 2, highlight = true, connect = null, collapse = false;

        function initUI() {
            if (value == null) return;
            var target = document.getElementById("view");
            target.innerHTML = "";
            dv = CodeMirror.MergeView(target, {
                value: value,
                origLeft: panes == 3 ? orig1 : null,
                orig: orig2,
                lineNumbers: false,
                // mode: "vim",
                allowEditingOriginals: false,
                highlightDifferences: highlight,
                connect: connect,
                collapseIdentical: collapse,
                indentUnit: 4,
                theme: 'idea',
                smartIndent: true,
                keyMap: 'vim',
                styleActiveLine: true,
                matchBrackets: true,
                mode: {name: "javascript", json: true},
                lineWrapping: true,
                foldGutter: true,
                autocorrect: true,
                autoRefresh: true,
                autoCloseBrackets: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
                lint: true,
            });
        }

        function toggleDifferences() {
            dv.setShowDifferences(highlight = !highlight);
        }

        function mergeViewHeight(mergeView) {
            function editorHeight(editor) {
                if (!editor) return 0;
                return editor.getScrollInfo().height;
            }

            return Math.max(editorHeight(mergeView.leftOriginal()),
                editorHeight(mergeView.editor()),
                editorHeight(mergeView.rightOriginal()));
        }

        function resize(mergeView) {
            var height = mergeViewHeight(mergeView);
            for (; ;) {
                if (mergeView.leftOriginal())
                    mergeView.leftOriginal().setSize(null, height);
                mergeView.editor().setSize(null, height);
                if (mergeView.rightOriginal())
                    mergeView.rightOriginal().setSize(null, height);

                var newHeight = mergeViewHeight(mergeView);
                if (newHeight >= height) break;
                else height = newHeight;
            }
            mergeView.wrap.style.height = height + "px";
        }

        // value = document.documentElement.innerHTML;
        value = left;
        // orig1 = "aaaaaaaaaaaaaaaaaa";
        orig2 = right;
        initUI();
    }

    function notify4Monitor(icon, title, message, type) {
        $.notify({
            icon: 'glyphicon glyphicon-' + icon,
            title: title,
            message: message
        }, {
            type: type,
            showProgressbar: true,
            allow_dismiss: true,
            newest_on_top: true,
            delay: 2000,
        })
    }

    // 设置编辑器
    var editor = CodeMirror.fromTextArea($('#code')[0], {
        // height: 'auto',
        // viewportMargin: 'Infinity',
        // scrollbarStyle: 'null',
        lineNumbers: true, // 显示行号
        indentUnit: 4,
        theme: 'idea',
        smartIndent: true,
        keyMap: 'vim',
        styleActiveLine: true,
        matchBrackets: true,
        mode: {name: "javascript", json: true},
        lineWrapping: true,
        foldGutter: true,
        autocorrect: true,
        autoRefresh: true,
        autoCloseBrackets: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
        lint: true,
        extraKeys: {
            Tab: function (cm) {
                var spaces = Array(cm.getOption("indentUnit") + 1).join(" ")
                cm.replaceSelection(spaces)
            },
            "F11": function (cm) {
                cm.setOption("fullScreen", !cm.getOption("fullScreen"))
            },
            "F7": function autoFormat(cm) {
                cm.autoFormatRange({line: 0, ch: 0}, {line: cm.lineCount()});
            },
            "Ctrl-S": function () {
                $('#save-config').click()
            }
        }
    });
    CodeMirror.commands.autocomplete = function (cm) {
        cm.showHint({hint: CodeMirror.hint.anyword});
    };

    function checkButtonBeAble() {
        var newConfig = editor.getValue();
        diffMode(newConfig, oldConfig)
        if (newConfig.trim() === "" || $('.CodeMirror-lint-marker,.CodeMirror-lint-mark').length != 0) {
            button.attr('disabled', 'disabled')
        } else {
            button.removeAttr('disabled')
        }
    }

    // check button is enabled
    checkButtonBeAble();

    editor.on('update', checkButtonBeAble);

    // 设置li change config 监听事件
    $('.dropdown-menu>li>a').on('click', function (e) {
        var that = $(this);
        var innerText = that.text();
        var configName = "";
        configActive.text(innerText);

        switch (innerText) {
            case "Master 管理":
                configName = "master"
                break
            case "Worker 管理":
                configName = "worker"
                break
            case "Alarm 管理":
                configName = "alarm"
                break
        }
        sendConfigMateDateByAjax(that, -1, configName, 'config');
        notify4Monitor('ok', '配置切换', "配置切换成功，切换为 " + that.parent('li').attr('id'), 'success')
    });

    // 设置 change config 版本 li监听
    $('#history-config').on('click','.change-rev', function (e){
        var that = $(this);
        switch ($('#config-active').text()) {
            case "Master 管理":
                configName = "master"
                break
            case "Worker 管理":
                configName = "worker"
                break
            case "Alarm 管理":
                configName = "alarm"
                break
        }

        sendConfigMateDateByAjax(that, Number(that.attr('rev')), configName, 'reversion');
        notify4Monitor('ok', '版本切换', "版本切换成功，切换为 " + that.attr('rev'), 'success');
    })

    function sendConfigMateDateByAjax(that, rev, configName, flag) {
        configActive.attr('configType', configName);
        // 像后端发起请求，请求指定json配置
        $.ajax({
            url: '/config/get/',
            type: 'post',
            dataType: 'json',
            data: {config: configName, reversion: rev},
            success: function (e) {
                var parseValue = "";
                var ul = $('#history-config ul');
                var dataObj = e.data;
                if (e.errno === 1) {
                    parseValue = JSON.stringify(dataObj, null, '\t');
                    // 只读，编辑区域还不能获得焦点
                    editor.setOption('readOnly', 'nocursor')
                    button.hide();
                    $('#dropdownMenu1').hide();
                } else {
                    var config = dataObj.config;
                    globalMd5 = $.md5(config.trim())
                    parseValue = JSON.stringify(JSON.parse(config), null, '\t');
                    button.show();
                    ul.empty();

                    // 当历史配置存在多
                    if (dataObj.reversion.length > 0) {
                        $('#dropdownMenu1').show();
                        for (var i = dataObj.reversion.length - 1; i >= 0; i--) {
                            var version = dataObj.reversion[i];
                            var li = $('<li></li>').append($('<a class="change-rev" rev="'+version+'" href="#">版本 - '+version+'</a>'))
                            ul.append(li)
                        }
                    } else {
                        $('#dropdownMenu1').hide();
                    }
                }
                // 输出格式化json字符串   如果配置文件修改，三屏同步；如果版本修改，只同步左侧  右侧保证diff功能
                editor.setValue(parseValue)
                if (flag === 'config') {
                    // 三页面同时刷新为最新配置
                    oldConfig = parseValue
                    diffMode(oldConfig, oldConfig)
                }
            }
        })
    }

    // 保存配置
    $('#save-config').on('click', function (e) {
        var configType = configActive.attr('configType');
        if ($.md5(editor.getValue().trim()) === globalMd5) {
            notify4Monitor('info-sign', '配置修改', configType + "配置项未变动", 'warning')
            return
        }

        $.ajax({
            url: '/config/update',
            type: 'post',
            dataType: 'json',
            data: {data: editor.getValue(), type: configType},
            success: function (e) {
                if (e.errno === 1) {
                    notify4Monitor('exclamation-sign', '配置修改', configType + "配置修改失败" + e.msg, 'error')
                } else {
                    notify4Monitor('ok', '配置修改', configType + "配置修改成功", 'success')
                }
            }
        });
    })
}())

