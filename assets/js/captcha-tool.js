(function () {
    const { byId, showToast, triggerDownload } = window.AppUtils;

    let images = [];
    // Viewport-independent: center position as ratio of image size, scale relative to fitScale
    let imageCrops = [];
    let imageSizes = [];
    const correctAnswers = new Set();

    let questionInput, gridEl, questionDisplay, answerCountEl, exportBtn, thumbGridEl, batchUploadEl, batchInputEl, verifyBtnEl;

    function init() {
        questionInput = byId('captchaQuestion');
        gridEl = byId('captcha-grid');
        questionDisplay = byId('captcha-question-display');
        answerCountEl = byId('captchaAnswerCount');
        exportBtn = byId('btnExportCaptcha');
        thumbGridEl = byId('captchaThumbGrid');
        batchUploadEl = byId('captchaBatchUpload');
        batchInputEl = byId('captchaBatchInput');
        verifyBtnEl = gridEl.parentElement.querySelector('.captcha-verify-btn');

        bindBatchUpload();
        bindEvents();
        renderAll();
    }

    // ── Batch Upload ──

    function bindBatchUpload() {
        batchUploadEl.addEventListener('click', (e) => {
            if (e.target !== batchInputEl) batchInputEl.click();
        });

        batchInputEl.addEventListener('change', (e) => {
            addFiles(e.target.files);
            batchInputEl.value = '';
        });

        batchUploadEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            batchUploadEl.classList.add('dragover');
        });

        batchUploadEl.addEventListener('dragleave', () => {
            batchUploadEl.classList.remove('dragover');
        });

        batchUploadEl.addEventListener('drop', (e) => {
            e.preventDefault();
            batchUploadEl.classList.remove('dragover');
            const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
            if (files.length) addFiles(files);
        });
    }

    function addFiles(fileList) {
        const files = [...fileList].filter(f => f.type.startsWith('image/'));
        if (!files.length) return;

        let loaded = 0;
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const tempImg = new Image();
                tempImg.onload = () => {
                    images.push(dataUrl);
                    imageCrops.push({ centerXRatio: 0.5, centerYRatio: 0.5, scaleRel: 1.0 });
                    imageSizes.push({ w: tempImg.naturalWidth, h: tempImg.naturalHeight });
                    loaded++;
                    if (loaded === files.length) {
                        correctAnswers.clear();
                        renderAll();
                        showToast('已添加 ' + files.length + ' 张图片');
                    }
                };
                tempImg.src = dataUrl;
            };
            reader.readAsDataURL(file);
        });
    }

    // ── Render ──

    function renderAll() {
        renderPreviewGrid();
        renderThumbGrid();
        updateAnswerCount();
        batchUploadEl.classList.toggle('has-images', images.length > 0);
    }

    // Compute CSS transform from crop data for a given container size
    function computeCssTransform(crop, imgW, imgH, containerW, containerH) {
        var fitScale = Math.min(containerW / imgW, containerH / imgH);
        var s = fitScale * crop.scaleRel;
        var tx = (containerW / s - imgW) * crop.centerXRatio;
        var ty = (containerH / s - imgH) * crop.centerYRatio;
        return { scale: s, x: tx, y: ty };
    }

    function applyCropToImg(imgEl, crop, imgW, imgH, containerW, containerH) {
        imgEl.style.width = imgW + 'px';
        imgEl.style.height = imgH + 'px';
        var t = computeCssTransform(crop, imgW, imgH, containerW, containerH);
        imgEl.style.transform = 'scale(' + t.scale + ') translate(' + t.x + 'px, ' + t.y + 'px)';
    }

    function renderPreviewGrid() {
        gridEl.innerHTML = '';
        var count = Math.max(images.length, 9);
        for (var i = 0; i < count; i++) {
            var cell = document.createElement('div');
            cell.className = 'captcha-cell';

            var img = document.createElement('img');
            img.alt = '图片 ' + (i + 1);
            if (images[i]) {
                img.src = images[i];
                (function(idx, imgEl) {
                    var onReady = function() {
                        var cellW = cell.offsetWidth || 100;
                        var cellH = cell.offsetHeight || 100;
                        applyCropToImg(imgEl, imageCrops[idx], imageSizes[idx].w, imageSizes[idx].h, cellW, cellH);
                    };
                    if (imgEl.complete) {
                        requestAnimationFrame(onReady);
                    } else {
                        imgEl.onload = onReady;
                    }
                })(i, img);
            }

            var check = document.createElement('div');
            check.className = 'captcha-check';

            cell.appendChild(img);
            cell.appendChild(check);

            if (images[i]) {
                (function(idx) {
                    cell.addEventListener('click', function() { openEditor(idx); });
                })(i);
                if (correctAnswers.has(i)) {
                    cell.classList.add('selected');
                }
            }

            gridEl.appendChild(cell);
        }
    }

    function renderThumbGrid() {
        thumbGridEl.innerHTML = '';

        if (images.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'captcha-thumb-empty';
            empty.textContent = '暂无图片';
            thumbGridEl.appendChild(empty);
            return;
        }

        images.forEach(function(src, i) {
            var item = document.createElement('div');
            item.className = 'captcha-thumb-item';
            item.draggable = true;
            item.dataset.index = i;

            var img = document.createElement('img');
            img.src = src;
            (function(idx, imgEl) {
                var onReady = function() {
                    var thumbW = 80;
                    var thumbH = 80;
                    applyCropToImg(imgEl, imageCrops[idx], imageSizes[idx].w, imageSizes[idx].h, thumbW, thumbH);
                };
                if (imgEl.complete) {
                    requestAnimationFrame(onReady);
                } else {
                    imgEl.onload = onReady;
                }
            })(i, img);

            var indexLabel = document.createElement('div');
            indexLabel.className = 'thumb-index';
            indexLabel.textContent = i + 1;

            var removeBtn = document.createElement('button');
            removeBtn.className = 'thumb-remove';
            removeBtn.type = 'button';
            removeBtn.textContent = '×';
            (function(idx) {
                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    removeImage(idx);
                });
            })(i);

            item.appendChild(img);
            item.appendChild(indexLabel);
            item.appendChild(removeBtn);

            item.addEventListener('dragstart', onDragStart);
            item.addEventListener('dragover', onDragOver);
            item.addEventListener('dragleave', onDragLeave);
            item.addEventListener('drop', onDrop);
            item.addEventListener('dragend', onDragEnd);

            (function(idx) {
                item.addEventListener('dblclick', function() { openEditor(idx); });
            })(i);

            thumbGridEl.appendChild(item);
        });

        var addMore = document.createElement('div');
        addMore.className = 'captcha-add-more';
        addMore.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>继续添加</span>';
        addMore.addEventListener('click', function() { batchInputEl.click(); });
        thumbGridEl.appendChild(addMore);
    }

    // ── Image Editor Modal ──

    function openEditor(index) {
        var src = images[index];
        var crop = imageCrops[index];
        var size = imageSizes[index];
        if (!src) return;

        var overlay = document.createElement('div');
        overlay.className = 'captcha-editor-overlay';

        var content = document.createElement('div');
        content.className = 'captcha-editor-content';

        var title = document.createElement('div');
        title.className = 'captcha-editor-title';
        title.textContent = '调整图片 #' + (index + 1);

        var viewport = document.createElement('div');
        viewport.className = 'captcha-editor-viewport';

        var img = document.createElement('img');
        img.src = src;
        viewport.appendChild(img);

        var zoomRow = document.createElement('div');
        zoomRow.className = 'captcha-editor-zoom';
        zoomRow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6M11 8v6"/></svg>';

        var zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.min = '50';
        zoomSlider.max = '300';
        zoomSlider.value = String(Math.round(crop.scaleRel * 100));

        var zoomVal = document.createElement('span');
        zoomVal.className = 'captcha-editor-zoom-val';
        zoomVal.textContent = Math.round(crop.scaleRel * 100) + '%';

        zoomRow.appendChild(zoomSlider);
        zoomRow.appendChild(zoomVal);

        var actions = document.createElement('div');
        actions.className = 'captcha-editor-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'captcha-editor-cancel';
        cancelBtn.type = 'button';
        cancelBtn.textContent = '取消';

        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'captcha-editor-toggle';
        toggleBtn.type = 'button';
        if (correctAnswers.has(index)) {
            toggleBtn.classList.add('is-answer');
            toggleBtn.textContent = '✓ 已标记为答案';
        } else {
            toggleBtn.textContent = '标记为答案';
        }

        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'captcha-editor-confirm';
        confirmBtn.type = 'button';
        confirmBtn.textContent = '确认';

        actions.appendChild(cancelBtn);
        actions.appendChild(toggleBtn);
        actions.appendChild(confirmBtn);

        content.appendChild(title);
        content.appendChild(viewport);
        content.appendChild(zoomRow);
        content.appendChild(actions);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // State
        var imgW = size.w;
        var imgH = size.h;
        var currentCenterXRatio = crop.centerXRatio;
        var currentCenterYRatio = crop.centerYRatio;
        var currentScaleRel = crop.scaleRel;
        var isDragging = false;
        var dragStartX, dragStartY, startCenterXRatio, startCenterYRatio;

        function updateTransform() {
            var vw = viewport.offsetWidth;
            var vh = viewport.offsetHeight;
            img.style.width = imgW + 'px';
            img.style.height = imgH + 'px';
            var t = computeCssTransform({ centerXRatio: currentCenterXRatio, centerYRatio: currentCenterYRatio, scaleRel: currentScaleRel }, imgW, imgH, vw, vh);
            img.style.transform = 'scale(' + t.scale + ') translate(' + t.x + 'px, ' + t.y + 'px)';
            zoomSlider.value = String(Math.round(currentScaleRel * 100));
            zoomVal.textContent = Math.round(currentScaleRel * 100) + '%';
        }

        function initImage() {
            updateTransform();
        }

        if (img.complete) {
            requestAnimationFrame(initImage);
        } else {
            img.onload = initImage;
        }

        // Drag to pan
        viewport.addEventListener('mousedown', function(e) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            startCenterXRatio = currentCenterXRatio;
            startCenterYRatio = currentCenterYRatio;
            e.preventDefault();
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            var vw = viewport.offsetWidth;
            var vh = viewport.offsetHeight;
            var fitScale = Math.min(vw / imgW, vh / imgH);
            var s = fitScale * currentScaleRel;
            var dx = (e.clientX - dragStartX) / s;
            var dy = (e.clientY - dragStartY) / s;
            // Convert pixel delta to ratio delta
            currentCenterXRatio = startCenterXRatio + dx / imgW;
            currentCenterYRatio = startCenterYRatio + dy / imgH;
            // Clamp
            currentCenterXRatio = Math.max(0, Math.min(1, currentCenterXRatio));
            currentCenterYRatio = Math.max(0, Math.min(1, currentCenterYRatio));
            updateTransform();
        }

        function onMouseUp() {
            isDragging = false;
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        // Scroll to zoom
        viewport.addEventListener('wheel', function(e) {
            e.preventDefault();
            var delta = e.deltaY > 0 ? -10 : 10;
            var newPercent = Math.min(300, Math.max(50, Math.round(currentScaleRel * 100) + delta));
            currentScaleRel = newPercent / 100;
            updateTransform();
        });

        zoomSlider.addEventListener('input', function() {
            currentScaleRel = parseInt(zoomSlider.value, 10) / 100;
            updateTransform();
        });

        toggleBtn.addEventListener('click', function() {
            if (correctAnswers.has(index)) {
                correctAnswers.delete(index);
                toggleBtn.classList.remove('is-answer');
                toggleBtn.textContent = '标记为答案';
            } else {
                correctAnswers.add(index);
                toggleBtn.classList.add('is-answer');
                toggleBtn.textContent = '✓ 已标记为答案';
            }
        });

        confirmBtn.addEventListener('click', function() {
            imageCrops[index] = { centerXRatio: currentCenterXRatio, centerYRatio: currentCenterYRatio, scaleRel: currentScaleRel };
            cleanup();
            renderAll();
        });

        cancelBtn.addEventListener('click', function() {
            cleanup();
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) cleanup();
        });

        function onKeyDown(e) {
            if (e.key === 'Escape') cleanup();
        }
        document.addEventListener('keydown', onKeyDown);

        function cleanup() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
        }
    }

    // ── Drag & Drop Reorder ──

    var dragIndex = null;

    function onDragStart(e) {
        dragIndex = parseInt(this.dataset.index, 10);
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over');
    }

    function onDragLeave() {
        this.classList.remove('drag-over');
    }

    function onDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        var dropIndex = parseInt(this.dataset.index, 10);
        if (dragIndex === null || dragIndex === dropIndex) return;

        swap(images, dragIndex, dropIndex);
        swap(imageCrops, dragIndex, dropIndex);
        swap(imageSizes, dragIndex, dropIndex);

        var newAnswers = new Set();
        correctAnswers.forEach(function(idx) {
            if (idx === dragIndex) newAnswers.add(dropIndex);
            else if (idx === dropIndex) newAnswers.add(dragIndex);
            else newAnswers.add(idx);
        });
        correctAnswers.clear();
        newAnswers.forEach(function(idx) { correctAnswers.add(idx); });

        renderAll();
    }

    function swap(arr, i, j) {
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    function onDragEnd() {
        this.classList.remove('dragging');
        dragIndex = null;
        thumbGridEl.querySelectorAll('.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
    }

    // ── Remove Image ──

    function removeImage(index) {
        images.splice(index, 1);
        imageCrops.splice(index, 1);
        imageSizes.splice(index, 1);

        var newAnswers = new Set();
        correctAnswers.forEach(function(idx) {
            if (idx < index) newAnswers.add(idx);
            else if (idx > index) newAnswers.add(idx - 1);
        });
        correctAnswers.clear();
        newAnswers.forEach(function(idx) { correctAnswers.add(idx); });

        renderAll();
    }

    // ── Answer Count ──

    function updateAnswerCount() {
        answerCountEl.textContent = '已选 ' + correctAnswers.size + ' 个答案';
        if (verifyBtnEl) {
            verifyBtnEl.textContent = correctAnswers.size > 0 ? '验证' : '跳过';
        }
    }

    // ── Events ──

    function bindEvents() {
        questionInput.addEventListener('input', function() {
            questionDisplay.textContent = questionInput.value || '请选出包含云朵的图片';
        });

        exportBtn.addEventListener('click', exportImage);
    }

    // ── Export ──

    function exportImage() {
        if (images.length === 0) {
            showToast('请先上传图片', true);
            return;
        }

        showToast('图片生成中...');
        exportBtn.disabled = true;

        var captureArea = byId('captcha-capture-area');
        html2canvas(captureArea, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        }).then(function(canvas) {
            triggerDownload('验证码拼图.png', canvas.toDataURL('image/png'));
            showToast('图片已下载');
        }).catch(function() {
            showToast('导出失败，请重试', true);
        }).finally(function() {
            exportBtn.disabled = false;
        });
    }

    window.CaptchaTool = { init };
})();
