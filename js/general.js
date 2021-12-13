$(document).ready(function () {
    function getCronInformation() {
        $.ajax({
            url: '/job/cron-info',
            type: 'get',
            dataType: 'json',
            success: function (resp) {

                var obj = resp.data;
                $('#total-cron').text('当前定时任务: ' + obj.totalCron);
                $('#success-cron').text('成功定时记录: ' + obj.successCronLog);
                $('#enabled-cron').text('已开启的定时任务: ' + obj.enabledCron);
                var percent =  Object.is(obj.percent, NaN) ? 100 : obj.percent;
                $('#percent').text('执行成功率: ' + percent + '%');
                $('#error-cron').text('失败定时记录: ' + obj.errorCronLog);
                $('#disabled-cron').text('未开启的定时任务: ' + obj.disabledCron);
            }
        })
    }

    getCronInformation();
    setInterval(getCronInformation, 10000);
}())

