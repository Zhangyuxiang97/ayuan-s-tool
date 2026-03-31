document.addEventListener('DOMContentLoaded', () => {
    window.AppUtils.bindToolNavigation();
    window.LogoTool.init();
    window.CalendarTool.init();

    const savedTool = window.AppUtils.loadState('active_tool', 'tool-logo');
    window.AppUtils.switchTool(savedTool);
});
