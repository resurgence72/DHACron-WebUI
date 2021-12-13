$(document).ready(function () {
    function getQueryString(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
        var r = window.location.search.substr(1).match(reg);
        if (r != null) return unescape(r[2]);
        return null;
    }

    var hostURI = window.location.host;
    var protocol = document.location.protocol.split(':')[0];

    var socket = new WebSocket(protocol === "https" ? "wss" : "ws" + '://' + hostURI + '/tty/web-shell?cols=220&rows=40&ip='+getQueryString('ip'));

    var term = new Terminal({
        cols: 180,
        rows: 50,
        screenKeys: true,
        cursorBlink: true,
        cursorStyle: "block",
        fontSize: 20,
        fontFamily: `'Fira Mono', monospace`,
    });

    term.open($('#terms')[0]);

    window.onresize = function () {
        fit.fit(term);
    };

    // 注册页面刷新关闭事件，刷新后关闭 ws
    window.addEventListener("beforeunload", function (event) {
        socket.close()
    });

    socket.onopen = function () {
        layer.msg("Opening TTY...", {time: 1000}, function () {
            // term.write("opening web-shell...\r\n\n")
            term.toggleFullscreen(true);

            fit.fit(term);
            term.focus();

            term.on('data', function (data) {
                let sdata = {
                    type: "cmd",
                    cmd: data,
                }
                socket.send(str2utf8(JSON.stringify(sdata)));
            });

            term.on('resize', size => {
                //console.log('resize', [size.cols, size.rows]);
                let sdata = {
                    type: "resize",
                    cols: size.cols,
                    rows: size.rows,
                }
                socket.send(JSON.stringify(sdata));
            });
        })
    }

    socket.onmessage = function (msg) {
        let reader = new FileReader();
        reader.onload = function (event) {
            term.write(reader.result);
        };
        reader.readAsText(msg.data);
        //term.write(msg.data);
    };

    socket.onerror = function (e) {
        disconnectWs('TTY Connection failed, In the closed...')
    };

    socket.onclose = function (e) {
        disconnectWs('TTY Disconnect, Redirecting...')
    };

    function str2utf8(str) {
        return new TextEncoder('utf8').encode(str)
    }

    function goHostIndex() {
        window.location.replace(protocol + "://" + hostURI);
    }

    function disconnectWs(msg) {
        layer.msg(msg, {time: 2000}, function () {
            term.dispose();
            socket.close()
            goHostIndex();
        })
    }
})





