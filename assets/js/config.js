(function () {
    const currentDate = new Date();

    window.AppConfig = {
        shared: {
            storeKey: 'yidian_toolbox_',
            toastDurationMs: 2000
        },
        logoTool: {
            defaultMode: 'text',
            defaultFileName: '商标图样',
            defaultText: '商标文字',
            textCanvasSize: 800,
            defaultExportQuality: 0.95,
            maxFileSizeBytes: 2097152,
            uploadReplaceText: '点击重新上传更换'
        },
        calendarTool: {
            initialYear: currentDate.getFullYear(),
            initialMonth: currentDate.getMonth() + 2,
            holidayDataUrlTemplate: 'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{year}.json',
            exportScale: 2,
            exportFileNamePrefix: '壹点日历',
            customBackgroundLabel: '自定义背景',
            clearCustomBackgroundLabel: '清除自定义',
            customBackgroundAppliedToast: '✅ 自定义背景已应用',
            holidaySyncErrorToast: '坏了，假期同步出问题了，快联系阿翔！',
            exportLoadingText: '图片生成中...',
            exportSuccessToast: '✅ 日历图片已下载',
            exportErrorToast: '❌ 生成图片失败',
            restBadgeText: '休',
            workBadgeText: '班',
            monthBgImages: [
                'https://images.unsplash.com/photo-1478719059408-592965723cbc?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1000&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?q=80&w=1000&auto=format&fit=crop'
            ]
        }
    };
})();
