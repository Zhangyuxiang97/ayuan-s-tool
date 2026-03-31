(function () {
    const {
        byId,
        loadState,
        saveState,
        setHidden,
        showToast,
        bindRangeValue,
        triggerDownload
    } = window.AppUtils;
    const logoConfig = window.AppConfig.logoTool;

    window.LogoTool = {
        currentMode: logoConfig.defaultMode,
        uploadedImage: null,
        originalFileName: logoConfig.defaultFileName,

        init() {
            this.cacheElements();
            this.currentMode = loadState('logo_active_tab', logoConfig.defaultMode);

            this.bindTabs();
            this.bindTextControls();
            this.bindUploadControls();
            this.bindImageControls();
            this.bindExportControls();

            this.activateMode(this.currentMode, false);
            this.renderCanvas();
        },

        cacheElements() {
            this.canvas = byId('previewCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.emptyState = byId('emptyState');
            this.imageStats = byId('imageStats');
            this.textInput = byId('textInput');
            this.fontSelect = byId('fontSelect');
            this.fontSizeRange = byId('fontSizeRange');
            this.dropZone = byId('dropZone');
            this.fileInput = byId('fileInput');
            this.imgSizeRange = byId('imgSizeRange');
            this.imgQualityRange = byId('imgQualityRange');
            this.uploadStatus = byId('uploadStatus');
            this.uploadSubText = byId('uploadSubText');
            this.uploadIcon = byId('uploadIcon');
            this.tabButtons = document.querySelectorAll('#controls-tool-logo .tab-btn');
            this.panels = document.querySelectorAll('#controls-tool-logo .tab-panel');
        },

        bindTabs() {
            this.tabButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    this.activateMode(button.dataset.tab);
                    this.renderCanvas();
                });
            });
        },

        activateMode(mode, persist = true) {
            this.currentMode = mode;

            this.tabButtons.forEach((button) => {
                button.classList.toggle('active', button.dataset.tab === mode);
            });

            this.panels.forEach((panel) => {
                panel.classList.toggle('active', panel.id === `panel-${mode}`);
            });

            if (persist) {
                saveState('logo_active_tab', mode);
            }
        },

        bindTextControls() {
            [this.textInput, this.fontSelect].forEach((element) => {
                element.addEventListener('input', () => this.renderCanvas());
            });

            bindRangeValue('fontSizeRange', 'fontSizeVal', 'px', () => this.renderCanvas());
        },

        bindUploadControls() {
            this.dropZone.addEventListener('click', () => this.fileInput.click());
            this.fileInput.addEventListener('change', (event) => this.handleFile(event.target.files[0]));

            this.dropZone.addEventListener('dragover', (event) => {
                event.preventDefault();
                this.dropZone.classList.add('dragover');
            });

            this.dropZone.addEventListener('dragleave', () => {
                this.dropZone.classList.remove('dragover');
            });

            this.dropZone.addEventListener('drop', (event) => {
                event.preventDefault();
                this.dropZone.classList.remove('dragover');
                this.handleFile(event.dataTransfer.files[0]);
            });
        },

        bindImageControls() {
            bindRangeValue('imgSizeRange', 'imgSizeVal', 'px', () => this.renderCanvas());
            bindRangeValue('imgQualityRange', 'imgQualityVal', '%', () => {
                if (this.uploadedImage) this.updateStats();
            });
        },

        bindExportControls() {
            byId('btnSaveText').addEventListener('click', () => this.exportImage());
            byId('btnSaveImage').addEventListener('click', () => {
                if (!this.uploadedImage) {
                    showToast('请先上传图片', true);
                    return;
                }

                this.exportImage();
            });
        },

        renderCanvas() {
            if (this.currentMode === 'text') {
                this.renderTextCanvas();
                return;
            }

            this.renderImageCanvas();
        },

        renderTextCanvas() {
            const canvasSize = logoConfig.textCanvasSize;
            this.resizeCanvas(canvasSize);
            this.fillCanvasBackground(canvasSize);

            this.ctx.fillStyle = '#000000';
            this.ctx.font = `bold ${this.fontSizeRange.value}px ${this.fontSelect.value}`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.textInput.value || logoConfig.defaultText, canvasSize / 2, canvasSize / 2);
        },

        renderImageCanvas() {
            if (!this.uploadedImage) {
                this.showEmptyState();
                return;
            }

            const outputSize = Number(this.imgSizeRange.value);
            this.resizeCanvas(outputSize);
            this.fillCanvasBackground(outputSize);

            const scale = Math.min(
                outputSize / this.uploadedImage.naturalWidth,
                outputSize / this.uploadedImage.naturalHeight
            );
            const drawWidth = this.uploadedImage.naturalWidth * scale;
            const drawHeight = this.uploadedImage.naturalHeight * scale;

            this.ctx.drawImage(
                this.uploadedImage,
                (outputSize - drawWidth) / 2,
                (outputSize - drawHeight) / 2,
                drawWidth,
                drawHeight
            );

            this.updateStats();
        },

        resizeCanvas(size) {
            setHidden(this.emptyState, true);
            setHidden(this.canvas, false);
            this.canvas.width = size;
            this.canvas.height = size;
        },

        fillCanvasBackground(size) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(0, 0, size, size);
        },

        showEmptyState() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            setHidden(this.canvas, true);
            setHidden(this.emptyState, false);
            this.imageStats.classList.remove('show');
        },

        handleFile(file) {
            if (!file || !file.type.startsWith('image/')) return;

            this.originalFileName = file.name.replace(/\.[^/.]+$/, '');
            this.dropZone.classList.add('uploaded');
            this.uploadStatus.textContent = file.name;
            this.uploadSubText.textContent = logoConfig.uploadReplaceText;
            this.uploadIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    this.uploadedImage = img;
                    this.renderCanvas();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        },

        updateStats() {
            this.imageStats.classList.add('show');

            const outputSize = Number(this.imgSizeRange.value);
            byId('statOrig').textContent = `${this.uploadedImage.naturalWidth}×${this.uploadedImage.naturalHeight}`;
            byId('statOut').textContent = `${outputSize}×${outputSize}`;

            const dataUrl = this.canvas.toDataURL('image/jpeg', Number(this.imgQualityRange.value) / 100);
            const bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
            byId('statSize').textContent = bytes < 1048576
                ? `${(bytes / 1024).toFixed(1)} KB`
                : `${(bytes / 1048576).toFixed(2)} MB`;

            const statCheck = byId('statCheck');
            if (bytes > logoConfig.maxFileSizeBytes) {
                statCheck.textContent = '文件超规';
                statCheck.className = 'status-warn';
            } else {
                statCheck.textContent = '符合要求';
                statCheck.className = 'status-ok';
            }
        },

        exportImage() {
            const fileName = this.currentMode === 'text'
                ? `${this.textInput.value.trim() || logoConfig.defaultText}.jpg`
                : `${this.originalFileName}_生成.jpg`;
            const quality = this.currentMode === 'image'
                ? Number(this.imgQualityRange.value) / 100
                : logoConfig.defaultExportQuality;

            triggerDownload(fileName, this.canvas.toDataURL('image/jpeg', quality));
        }
    };
})();
