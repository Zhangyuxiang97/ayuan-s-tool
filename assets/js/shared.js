(function () {
    const { shared } = window.AppConfig;
    const STORE_KEY = shared.storeKey;
    let toastTimerId = null;

    function byId(id) {
        return document.getElementById(id);
    }

    function saveState(key, value) {
        localStorage.setItem(STORE_KEY + key, value);
    }

    function loadState(key, defaultValue) {
        return localStorage.getItem(STORE_KEY + key) || defaultValue;
    }

    function setActiveState(elements, isActive) {
        elements.forEach((element) => {
            element.classList.toggle('active', isActive(element));
        });
    }

    function setHidden(element, hidden) {
        element.classList.toggle('is-hidden', hidden);
    }

    function showToast(message, isError = false) {
        const toast = byId('toast');
        toast.textContent = message;
        toast.classList.toggle('is-error', isError);
        toast.classList.remove('show');
        void toast.offsetWidth;
        toast.classList.add('show');

        clearTimeout(toastTimerId);
        toastTimerId = setTimeout(() => {
            toast.classList.remove('show');
        }, shared.toastDurationMs);
    }

    function switchTool(target) {
        setActiveState(document.querySelectorAll('.tool-nav-btn'), (button) => button.dataset.target === target);
        setActiveState(document.querySelectorAll('.preview-content'), (preview) => preview.id === `preview-${target}`);
        setActiveState(document.querySelectorAll('.tool-control-group'), (control) => control.id === `controls-${target}`);
        saveState('active_tool', target);
    }

    function bindToolNavigation() {
        document.querySelectorAll('.tool-nav-btn').forEach((button) => {
            button.addEventListener('click', () => switchTool(button.dataset.target));
        });
    }

    function bindRangeValue(inputId, valueId, suffix, onInput) {
        const input = byId(inputId);
        const value = byId(valueId);

        input.addEventListener('input', (event) => {
            value.textContent = `${event.target.value}${suffix}`;
            if (onInput) onInput(event);
        });
    }

    function triggerDownload(download, href) {
        const link = document.createElement('a');
        link.download = download;
        link.href = href;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    window.AppUtils = {
        byId,
        saveState,
        loadState,
        setHidden,
        showToast,
        switchTool,
        bindToolNavigation,
        bindRangeValue,
        triggerDownload
    };
})();
