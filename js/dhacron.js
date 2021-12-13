$(document).ready(function () {
    $('.selectpicker').selectpicker();
    var timeUnitMap = {
        "0": "毫秒(ms)",
        "1": "秒(s)",
        "2": "分钟(min)",
        "3": "小时(h)",
    }

    var alarmTypeMap = {
        "0": "企微报警",
        "1": "Email报警"
    }

    var cronTypeMap = {
        "0": "定时任务",
        "1": "延迟任务"
    }

    var schedulerTypeMap = {
        "0": '单机',
        "1": "广播",
    }

    var processOptionMap = {
        "0": "护进程",
        "1": "并发执行"
    }

    // 确保数字只能输入正整数
    $('#edit-retryTime,#edit-timeOut').on('input propertychange', function () {
        var that = $(this);
        that.val(that.val() >= 1 ? that.val() : 1)
    })

    function dateFormat(timestamp) {
        return new moment(timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')
    }

    // 1. 绑定按钮的事件处理函数
    $("#job-list").on("click", ".edit-job", function (event) {
        $('#test-res').remove();
        // 如果点编辑任务  添加编辑标识
        $('#save-job').attr("type", "edit");

        $('#edit-or-save').text("编辑任务");
        $('#edit-job').removeAttr("disabled");
        // 取出当前job信息赋值给模态框input
        var that = $(this);

        $.ajax({
            url: '/job/get',
            type: 'post',
            data: {name: that.parents('tr').children('.job-name').text()},
            dataType: 'json',
            success: function (resp) {
                if (resp.errno != 0) {
                    return
                }
                var data = resp.data;
                $('#job-status').val(data.jobStatus);
                $('#edit-name').val(data.name).attr("readonly", "readonly");
                $('#edit-command').val(data.command);
                $('#edit-cronExpr').val(data.cronExpr);
                $('#edit-cronType').val(data.cronType);
                $('#edit-timeOut').val(data.timeOut);
                $('#edit-timeOutUnit').val(data.timeOutUnit);
                $('#alarm-type').val(data.alarmTypes);
                $('#scheduler-type').val(data.schedulerType);
                $('#edit-ipBind').val(data.ipBinds);
                $('#edit-cronWebHook').val(data.webHookURL);
                $('#edit-retryTime').val(data.retryTime);

                // 回显 报警 select 选项
                for (var i = 0; i < data.alarmTypes.length; i++) {
                    data.alarmTypes[i] = alarmTypeMap[data.alarmTypes[i]]
                }
                $('.alarm-type .filter-option-inner-inner').text(data.alarmTypes.join(","));

                // 回显 进程select 选项
                var processOptionArr = [];
                if (data.processMuti) {
                    processOptionArr.push("1")
                }
                if (data.processDaemon) {
                    processOptionArr.push("0")
                }
                for (var i = 0; i < processOptionArr.length; i++) {
                    processOptionArr[i] = processOptionMap[processOptionArr[i]]
                }
                $('.process-options .filter-option-inner-inner').text(processOptionArr.join(","));
            }
        })

        $('#edit-modal').modal('show');
    });

    $("#job-list").on("click", ".delete-job", function (event) {
        var that = $(this);
        var jobName = that.parents("tr").children('.job-name').text();
        $.ajax({
            url: '/job/delete',
            type: 'post',
            dataType: 'json',
            data: {name: jobName},
            complete: function (resp) {
                if (resp.errno === 1) {
                    swal({timer: 800, showConfirmButton: false, title: "任务删除成功"});
                    return
                }
                swal({timer: 800, showConfirmButton: false, text: resp.msg + ": " + JSON.stringify(resp.data)});
                that.parents("tr").remove();
            }
        })
    });

    $("#job-list").on("click", ".kill-job", function (event) {
        var jobName = $(this).parents("tr").children('.job-name').text();
        $.ajax({
            url: '/job/kill',
            type: 'post',
            dataType: 'json',
            data: {name: jobName},
            complete: function (resp) {
                if (resp.errno === 1) {
                    swal({timer: 800, showConfirmButton: false, title: resp.msg});
                    return
                }
                swal({
                    title: resp.errno === 1 ? "kill error, " + resp.msg : "kill success",
                    // text: "2秒后自动关闭。",
                    timer: 800,
                    showConfirmButton: false
                });
            }
        })
    });

    $('#job-list').on("click", ".strop-job", function (event) {
        var jobName = $(this).parents("tr").children('.job-name').text();
        $.ajax({
            url: '/job/strop',
            type: 'post',
            dataType: 'json',
            data: {name: jobName},
            success: function (resp) {
                if (resp.errno == 1) {
                    swal({timer: 800, showConfirmButton: false, title: resp.msg});
                    return
                }
                var status = resp.data ? "启用" : "停用";
                swal({timer: 800, showConfirmButton: false, title: status + " 状态切换成功"});
                rebuildJobList()
            }
        })
    });

    $("#job-list").on("click", ".log-job", function (event) {
        var jobName = $(this).parents("tr").children('.job-name').text();
        // 请求/job/log接口
        $.ajax({
            url: '/job/log',
            type: 'get',
            dataType: 'json',
            data: {name: jobName},
            success: function (resp) {
                if (resp.errno != 0) {
                    return
                }
                // 请求成功后第一件事需要先清空log列表
                $("#log-list tbody").empty();

                var logList = resp.data;
                // 遍历任务填充table
                for (var i = 0; i < logList.length; ++i) {
                    var log = logList[i];
                    var tr = $("<tr>")
                    tr.append($('<td style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" class="log-command">').html(log.command));
                    var ifErr = log.err ? "red" : "";
                    tr.append($('<td style="color:' + ifErr + ';" class="log-err">').html(log.err));
                    tr.append($('<td class="log-output">').html(log.output));
                    tr.append($('<td class="log-affiliatedIp">').html(log.affiliatedIp));
                    tr.append($('<td class="log-plantime">').html(dateFormat(log.plantime)));
                    tr.append($('<td class="log-scheduletime">').html(dateFormat(log.scheduletime)));
                    tr.append($('<td class="log-starttime">').html(dateFormat(log.starttime)));
                    tr.append($('<td class="log-endtime">').html(dateFormat(log.endtime)));

                    $("#log-list tbody").append(tr)
                }
            }
        });

        $('#log-modal').modal('show');
    });

    // 保存按钮 获取模态框内容，拼接成json格式发送给后端
    $('#save-job').on('click', function () {
        var alarmList = [];
        $('select[id="alarm-type"] option:selected').each(function () {
            alarmList.push($(this).val())
        });

        var processMuti = false;
        var processDaemon = false;
        $('select[id="process-options"] option:selected').each(function () {
            var value = $(this).val();
            if (value == "0") {
                processMuti = true
            } else if (value == "1") {
                processDaemon = true
            }
        });

        var jobObj = {
            name: $('#edit-name').val(),
            command: $('#edit-command').val(),
            cronExpr: $('#edit-cronExpr').val(),
            cronType: parseInt($('#edit-cronType').val()),
            timeOut: parseInt($("#edit-timeOut").val()),
            timeOutUnit: parseInt($('#edit-timeOutUnit').val()),
            jobStatus: $('#job-status').val() === "false" ? false : true,
            alarmTypes: alarmList,
            processMuti: processMuti,
            processDaemon: processDaemon,
            schedulerType: parseInt($('#scheduler-type').val()),
            ipBinds: $('#edit-ipBind').val() ? $('#edit-ipBind').val().split(',') : [],
            webHookURL: $('#edit-cronWebHook').val(),
            retryTime: parseInt($('#edit-retryTime').val()) || 1,
        };

        $.ajax({
            url: '/job/save',
            dateType: 'json',
            type: 'post',
            data: {job: JSON.stringify(jobObj), type: $(this).attr('type')},
            success: function (resp) {
                if (resp.errno === 1) {
                    swal({timer: 800, showConfirmButton: false, title: resp.msg});
                    $('#edit-modal').modal('hide');
                    return
                }
                $('#edit-modal').modal('hide');
                swal("回调响应", JSON.stringify(resp), {button: "确定",});
                rebuildJobList();
            }
        });
    });

    // 新建任务
    $('#new-job').on('click', function () {
        $('#test-res').remove();
        $('#save-job').attr('type', 'save');

        $('#edit-or-save').text("新建任务");
        $('#save-job').attr("disabled", "disabled");
        $('#cron-test').attr("disabled", "disabled");

        // 新建按钮 循环删除表单数据
        $('#edit-modal input').each(function () {
            $(this).val("");
        });

        $('#edit-name').removeAttr("readonly");
        $('#edit-modal').modal('show');
    });

    // 测试crontab 只需发送 command 和 超时时间
    $('#cron-test').on('click', function () {
        $('#test-res').remove();
        var span = $('<span id="test-res">');
        $.ajax({
            url: '/job/test',
            dateType: 'json',
            type: 'post',
            async: true,
            data: {
                command: $('#edit-command').val(),
                timeOut: parseInt($("#edit-timeOut").val()),
                timeOutUnit: parseInt($('#edit-timeOutUnit').val())
            },
            success: function (resp) {
                span.css("color", resp.errno ? "red" : "green").html(resp.msg + ", " + resp.data);
                $('.modal-footer').prepend(span);
            }
        });
        span.css("color", "blue").html("任务执行中........");
        $('.modal-footer').prepend(span);
    });

    // 为所有input框注册onfouce事件
    var allInput = $('#edit-modal input[class*=none-check]');
    allInput.on('keyup', function () {
        var flag = true
        allInput.each(function () {
            // console.log($(this).val())
            if (!$(this).val().trim().length) {
                flag = false
                if ($('#save-job').attr('disabled') === typeof undefined) {
                    $('#save-job').attr('disabled', true);
                    $('#cron-test').attr('disabled', true);
                }
                return
            }
        });
        if (flag) {
            $('#save-job').removeAttr("disabled");
            $('#cron-test').removeAttr("disabled");
        }
    })

    // health-list
    function getHealthInfoList() {
        $('#worker-list tbody').empty();
        $.ajax({
            url: '/worker/list',
            dataType: 'json',
            type: 'get',
            success: function (resp) {
                if (resp.errno != 0) {
                    return
                }
                var workerList = resp.data;
                $('#health-num').text(workerList.length)
                // 遍历任务填充table
                for (var i = 0; i < workerList.length; ++i) {
                    var nodeInfo = JSON.parse(workerList[i]);

                    var tr = $("<tr>")
                    tr.append($('<td class="worker-node-ip">').html(nodeInfo.node_ip));
                    tr.append($('<td class="worker-cpu-cores">').html(nodeInfo.cpu_usage));
                    tr.append($('<td class="worker-mem-size">').html(nodeInfo.mem_usage));
                    tr.append($('<td class="worker-disk-usage">').html(nodeInfo.disk_usage));
                    tr.append($('<td class="worker-boot-time">').html(nodeInfo.boot_time));
                    tr.append($('<td class="worker-goroutine-num">').html(nodeInfo.goroutine_num));
                    tr.append($('<td class="worker-host-mate">').html(nodeInfo.host_mate));
                    tr.append($('<td class="worker-version">').html("v" + nodeInfo.worker_version));
                    tr.append($('<a class="btn btn-link" href="/html/term.html?ip='+nodeInfo.node_ip+'" role="button"></a>').html("go-tty"));
                    $("#worker-list tbody").append(tr)
                }
            }
        })
    }

    $('#health-worker-list').on('click', function () {
        getHealthInfoList();
        $('#worker-modal').modal('show');
    })

    // 全局keydown 用于搜索
    $(document).on('keydown', function (e) {
        if (e.keyCode === 13) {
            innerSearch()
        }
    })

    // search 接口
    $('#job-search').on('click', function () {
        innerSearch()
    });

    function innerSearch() {
        var keyPre = $('#job-search-input').val();
        if (!keyPre.trim()) {
            rebuildJobList()
            return
        }
        searchReBuild(keyPre)
    }

    // 根据search input 搜索
    function searchReBuild(keyPre) {
        $.ajax({
            url: '/job/search',
            type: 'post',
            dataType: "json",
            data: {keyPre},
            success: function (resp) {
                if (resp.errno != 0) {
                    return
                }
                fillInTable(resp.data)
            }
        })
    }

    // 2. 定义一个函数 用于刷新任务列表
    function rebuildJobList() {
        // /job/list/
        var keyPre = $('#job-search-input').val();
        if (keyPre.trim()) {
            searchReBuild(keyPre)
        } else {
            $.ajax({
                url: "/job/list",
                dataType: "json",
                success: function (resp) {
                    if (resp.errno != 0) {
                        return
                    }
                    // 任务数组
                    fillInTable(resp.data)
                }
            });
        }

        $('.job-command').tooltip({
            delay: {show: 100, hide: 100},
            trigger: "hover focus click",
        });

        getHealthInfoList();
    }

    rebuildJobList();

    function fillInTable(jobList) {
        // 清理列表
        $("#job-list tbody").empty();
        // 遍历任务填充table
        for (var i = 0; i < jobList.length; ++i) {
            var job = jobList[i];
            var tr = $("<tr>")
            tr.append($('<td class="job-name">').html(job.name));
            tr.append($('<td style="word-break:break-all" class="job-command">').html(job.command));
            tr.append($('<td class="job-cronExpr">').html(job.cronExpr));
            tr.append($('<td class="job-cronType">').html(cronTypeMap[job.cronType]));
            tr.append($('<td class="job-timeOut">').html(job.timeOut));
            tr.append($('<td class="job-timeOutUnit">').html(timeUnitMap[job.timeOutUnit]));
            tr.append($('<td class="job-nextSchedulingTime">').html(job.nextSchedulingTime));

            for (var j = 0; j < job.alarmTypes.length; j++) {
                job.alarmTypes[j] = alarmTypeMap[job.alarmTypes[j]]
            }
            tr.append($('<td class="job-alarmType">').html(job.alarmTypes.join(",") || '抑制'));
            tr.append($('<td class="job-ipBinds">').html(job.ipBinds.join(',') || '[*]'));
            tr.append($('<td class="job-schedulerType">').html(schedulerTypeMap[job.schedulerType]));

            // 启用状态标签相关
            var spanClass = job.jobStatus ? "success" : "default";
            var spanText = job.jobStatus ? "启用" : "停用";
            var spanInTr = $('<td class="job-status">').append($('<span class="label label-' + spanClass + '"></span>').html(spanText))
            tr.append(spanInTr)

            var toolbar = $('<div class="btn-toolbar">')
                .append('<button class="btn btn-info edit-job">编辑</button>')
                .append('<button class="btn btn-danger delete-job">删除</button>')
                .append('<button class="btn btn-warning kill-job">kill</button>')
                .append('<button class="btn btn-success log-job">日志</button>')
                .append('<button class="btn btn-primary strop-job">启/停</button>')

            tr.append($('<td>').append(toolbar))
            $("#job-list tbody").append(tr)
        }
    };
})
