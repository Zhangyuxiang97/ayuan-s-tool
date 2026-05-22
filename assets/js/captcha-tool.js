(function () {
    const { byId, showToast, triggerDownload } = window.AppUtils;

    const GRID_SIZE = 9;
    const images = new Array(GRID_SIZE).fill(null);
    const correctAnswers = new Set();

    let questionInput, gridEl, questionDisplay, answerCountEl, exportBtn;

    function init() {
        questionInput = byId('captchaQuestion');
        gridEl = byId('captcha-grid');
        questionDisplay = byId('captcha-question-display');
        answerCountEl = byId('captchaAnswerCount');
        exportBtn = byId('btnExportCaptcha');

        buildPreviewGrid();
        bindUploadSlots();
        bindEvents();
    }

    function buildPreviewGrid() {
        gridEl.innerHTML = '';
        for (let i = 0; i < GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.className = 'captcha-cell';
            cell.dataset.index = i;

            const img = document.createElement('img');
            img.alt = '图片 ' + (i + 1);

            const check = document.createElement('div');
            check.className = 'captcha-check';
            check.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';

            cell.appendChild(img);
            cell.appendChild(check);
            cell.addEventListener('click', () => toggleAnswer(i));
            gridEl.appendChild(cell);
        }
    }

    function bindUploadSlots() {
        const slots = document.querySelectorAll('.captcha-upload-slot');
        slots.forEach((slot) => {
            const index = parseInt(slot.dataset.index, 10);
            const fileInput = slot.querySelector('input[type="file"]');

            slot.addEventListener('click', (e) => {
                if (e.target !== fileInput) fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                loadImage(file, index, slot);
            });
        });
    }

    function loadImage(file, index, slot) {
        const reader = new FileReader();
        reader.onload = (e) => {
            images[index] = e.target.result;

            slot.classList.add('uploaded');
            slot.style.backgroundImage = 'url(' + e.target.result + ')';
            slot.querySelector('.slot-num').textContent = '';

            updatePreviewCell(index);
        };
        reader.readAsDataURL(file);
    }

    function updatePreviewCell(index) {
        const cell = gridEl.children[index];
        const img = cell.querySelector('img');
        if (images[index]) {
            img.src = images[index];
            cell.classList.add('has-image');
        } else {
            img.removeAttribute('src');
            cell.classList.remove('has-image');
        }
    }

    function toggleAnswer(index) {
        if (!images[index]) {
            showToast('请先上传第 ' + (index + 1) + ' 张图片', true);
            return;
        }

        const cell = gridEl.children[index];
        if (correctAnswers.has(index)) {
            correctAnswers.delete(index);
            cell.classList.remove('correct');
        } else {
            correctAnswers.add(index);
            cell.classList.add('correct');
        }
        answerCountEl.textContent = '已选 ' + correctAnswers.size + ' 个答案';
    }

    function bindEvents() {
        questionInput.addEventListener('input', () => {
            questionDisplay.textContent = questionInput.value || '请选出包含云朵的图片';
        });

        exportBtn.addEventListener('click', exportImage);
    }

    function exportImage() {
        if (correctAnswers.size === 0) {
            showToast('请至少标记一个正确答案', true);
            return;
        }

        const hasAllImages = images.every((img) => img !== null);
        if (!hasAllImages) {
            showToast('请上传全部 9 张图片', true);
            return;
        }

        showToast('图片生成中...');
        exportBtn.disabled = true;

        const captureArea = byId('captcha-capture-area');
        html2canvas(captureArea, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        }).then((canvas) => {
            triggerDownload('验证码拼图.png', canvas.toDataURL('image/png'));
            showToast('图片已下载');
        }).catch(() => {
            showToast('导出失败，请重试', true);
        }).finally(() => {
            exportBtn.disabled = false;
        });
    }

    window.CaptchaTool = { init };
})();
