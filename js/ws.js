$(document).ready(function () {
    var timeID = 0;
    var hostURI = window.location.host;
    var protocol = document.location.protocol.split(':')[0];
    var ws = new WebSocket(protocol === "https" ? "wss" : "ws" + '://' + hostURI + '/worker/ws-monitor')

    // 注册页面刷新关闭事件，刷新后关闭ws
    window.addEventListener("beforeunload", function (event) {
        ws.close()
    });

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

    // 定时向server发送空消息防止websocket超时
    function keepAlive() {
        var timeOut = 20000;
        if (ws.readyState == ws.OPEN) {
            ws.send("");
        }
        timeID = setTimeout(keepAlive, timeOut)
    }

    function cancelKeepAlive() {
        if (timeID) {
            clearTimeout(timeID)
        }
    }

    ws.onopen = function (evt) {
        notify4Monitor('ok', '节点监控: ', '节点监控开启成功! ', 'success')
        keepAlive()
    };

    ws.onmessage = function (evt) {
        var data = JSON.parse(evt.data);
        console.log(data.data)
        // 忽略测试
        if (data.msg === "test") {
            return
        }
        data.notify_code ? notify4Monitor('exclamation-sign', '下线: ', data.msg, 'danger') : notify4Monitor('ok-circle', '上线: ', data.msg, 'success')
    };

    ws.onclose = function (evt) {
        cancelKeepAlive()
        console.log("ws close success")
    }
})

