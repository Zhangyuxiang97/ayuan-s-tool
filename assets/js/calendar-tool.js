(function () {
    const {
        byId,
        showToast,
        triggerDownload
    } = window.AppUtils;
    const calendarConfig = window.AppConfig.calendarTool;

    window.CalendarTool = {
        currentDate: new Date(),
        currentYear: calendarConfig.initialYear,
        currentMonth: calendarConfig.initialMonth,
        selectedDays: new Set(),
        holidayDataCache: {},
        dayLabels: {},
        customBgUrl: null,
        monthBgImages: calendarConfig.monthBgImages,

        init() {
            if (this.currentMonth > 12) {
                this.currentMonth = 1;
                this.currentYear++;
            }

            this.cacheElements();
            this.bindBackgroundUpload();
            this.bindActionControls();
            this.renderBackgroundTrigger();
            this.syncHolidaysAndRender();
        },

        cacheElements() {
            this.headerBg = byId('header-bg');
            this.backgroundTrigger = byId('cal-bg-trigger');
            this.backgroundTriggerLabel = this.backgroundTrigger.querySelector('span');
            this.backgroundUpload = byId('cal-bg-upload');
            this.currentMonthDisplay = byId('current-month-display');
            this.titleMonth = byId('title-month');
            this.titleYear = byId('title-year');
            this.grid = byId('calendar-grid');
            this.summaryRestDays = byId('summary-rest-days');
            this.captureArea = byId('capture-area');
            this.downloadButton = byId('download-cal-btn');
        },

        bindActionControls() {
            this.backgroundTrigger.addEventListener('click', (event) => this.handleBackgroundTriggerClick(event));
            byId('cal-prev-btn').addEventListener('click', () => this.changeMonth(-1));
            byId('cal-next-btn').addEventListener('click', () => this.changeMonth(1));
            this.downloadButton.addEventListener('click', () => this.exportImage());
        },

        bindBackgroundUpload() {
            this.backgroundUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file || !file.type.startsWith('image/')) return;

                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    this.customBgUrl = loadEvent.target.result;
                    this.updateBackground();
                    this.renderBackgroundTrigger();
                    showToast(calendarConfig.customBackgroundAppliedToast);
                };
                reader.readAsDataURL(file);
            });
        },

        handleBackgroundTriggerClick(event) {
            if (this.customBgUrl) {
                event.stopPropagation();
                this.customBgUrl = null;
                this.updateBackground();
                this.backgroundUpload.value = '';
                this.renderBackgroundTrigger();
                return;
            }

            this.backgroundUpload.click();
        },

        renderBackgroundTrigger() {
            if (this.customBgUrl) {
                this.backgroundTriggerLabel.textContent = calendarConfig.clearCustomBackgroundLabel;
                return;
            }

            this.backgroundTriggerLabel.textContent = calendarConfig.customBackgroundLabel;
        },

        changeMonth(offset) {
            this.currentMonth += offset;

            if (this.currentMonth > 12) {
                this.currentMonth = 1;
                this.currentYear++;
            } else if (this.currentMonth < 1) {
                this.currentMonth = 12;
                this.currentYear--;
            }

            this.syncHolidaysAndRender();
        },

        updateBackground() {
            const imageUrl = this.customBgUrl || this.monthBgImages[this.currentMonth - 1];
            this.headerBg.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0)), url('${imageUrl}')`;
        },

        async syncHolidaysAndRender() {
            this.resetCalendarState();
            this.updateBackground();
            this.selectWeekends();

            try {
                const yearData = await this.getHolidayData(this.currentYear);
                this.applyHolidayData(yearData);
            } catch (error) {
                console.error('同步法定假期失败:', error);
                showToast(calendarConfig.holidaySyncErrorToast, true);
            } finally {
                this.renderCalendar();
            }
        },

        resetCalendarState() {
            this.selectedDays.clear();
            this.dayLabels = {};
        },

        selectWeekends() {
            const daysInMonth = this.getDaysInMonth();
            for (let day = 1; day <= daysInMonth; day++) {
                const dayOfWeek = new Date(this.currentYear, this.currentMonth - 1, day).getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    this.selectedDays.add(day);
                }
            }
        },

        getDaysInMonth() {
            return new Date(this.currentYear, this.currentMonth, 0).getDate();
        },

        async getHolidayData(year) {
            if (this.holidayDataCache[year]) {
                return this.holidayDataCache[year];
            }

            const response = await fetch(calendarConfig.holidayDataUrlTemplate.replace('{year}', year));
            if (!response.ok) {
                throw new Error('网络请求假日失败');
            }

            const yearData = await response.json();
            this.holidayDataCache[year] = yearData;
            return yearData;
        },

        applyHolidayData(yearData) {
            const firstDayOfHoliday = this.getFirstDayOfHolidayMap(yearData.days);
            const monthPrefix = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;

            yearData.days.forEach((dayInfo) => {
                if (!dayInfo.date.startsWith(monthPrefix)) return;

                const dayNum = Number(dayInfo.date.split('-')[2]);
                if (dayInfo.isOffDay) {
                    this.selectedDays.add(dayNum);
                    this.dayLabels[dayNum] = {
                        badge: calendarConfig.restBadgeText,
                        badgeType: 'rest',
                        text: dayInfo.date === firstDayOfHoliday[dayInfo.name] ? dayInfo.name : ''
                    };
                    return;
                }

                this.selectedDays.delete(dayNum);
                this.dayLabels[dayNum] = { badge: calendarConfig.workBadgeText, badgeType: 'work', text: '' };
            });
        },

        getFirstDayOfHolidayMap(days) {
            const firstDayOfHoliday = {};

            [...days]
                .sort((a, b) => a.date.localeCompare(b.date))
                .forEach((dayInfo) => {
                    if (dayInfo.isOffDay && !firstDayOfHoliday[dayInfo.name]) {
                        firstDayOfHoliday[dayInfo.name] = dayInfo.date;
                    }
                });

            return firstDayOfHoliday;
        },

        renderCalendar() {
            this.updateMonthText();
            this.updateSummaryText();
            this.grid.innerHTML = '';

            const firstDayOfWeek = this.getFirstDayOffset();
            const daysInMonth = this.getDaysInMonth();
            let dayCounter = 1;

            for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
                if (dayCounter > daysInMonth) break;

                const row = document.createElement('div');
                row.className = 'week-row';

                for (let colIndex = 0; colIndex < 7; colIndex++) {
                    if ((rowIndex === 0 && colIndex < firstDayOfWeek) || dayCounter > daysInMonth) {
                        row.appendChild(this.createEmptyCell());
                    } else {
                        row.appendChild(this.createDayCell(dayCounter));
                        dayCounter++;
                    }
                }

                this.grid.appendChild(row);
            }

            this.drawHighlights();
        },

        updateMonthText() {
            this.currentMonthDisplay.textContent = `${this.currentYear} 年 ${this.currentMonth} 月`;
            this.titleMonth.textContent = String(this.currentMonth).padStart(2, '0');
            this.titleYear.textContent = this.currentYear;
        },

        getFirstDayOffset() {
            const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
            return firstDay === 0 ? 6 : firstDay - 1;
        },

        createEmptyCell() {
            const cell = document.createElement('div');
            cell.className = 'day-cell empty';
            return cell;
        },

        createDayCell(dayNum) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';

            const { badgeHtml, bottomText, textClass } = this.getDayMeta(dayNum);
            cell.innerHTML = `
                <div class="day-number-wrapper"><span class="day-number">${dayNum}</span>${badgeHtml}</div>
                <div class="${textClass}">${bottomText}</div>
            `;
            cell.dataset.day = dayNum;
            cell.addEventListener('click', () => this.toggleDaySelection(dayNum));

            return cell;
        },

        getDayMeta(dayNum) {
            let badgeHtml = '';
            let bottomText = '&nbsp;';
            let textClass = 'day-bottom-text';

            const label = this.dayLabels[dayNum];
            if (!label) {
                return { badgeHtml, bottomText, textClass };
            }

            if (label.badge) {
                const badgeClass = label.badgeType === 'rest' ? 'badge-rest' : 'badge-work';
                badgeHtml = `<span class="badge ${badgeClass}">${label.badge}</span>`;
            }

            if (label.text) {
                bottomText = label.text;
                textClass += ' holiday-text';
            }

            return { badgeHtml, bottomText, textClass };
        },

        toggleDaySelection(day) {
            if (this.selectedDays.has(day)) {
                this.selectedDays.delete(day);
            } else {
                this.selectedDays.add(day);
            }

            this.drawHighlights();
            this.updateSummaryText();
        },

        drawHighlights() {
            document.querySelectorAll('.highlight-box').forEach((element) => element.remove());

            document.querySelectorAll('.week-row').forEach((row) => {
                const cells = row.querySelectorAll('.day-cell');
                let startIndex = -1;

                cells.forEach((cell, index) => {
                    const day = cell.dataset.day ? Number(cell.dataset.day) : null;
                    const isSelected = day && this.selectedDays.has(day);

                    if (isSelected) {
                        if (startIndex === -1) startIndex = index;
                        return;
                    }

                    if (startIndex !== -1) {
                        this.createHighlightBox(row, startIndex, index - 1);
                        startIndex = -1;
                    }
                });

                if (startIndex !== -1) {
                    this.createHighlightBox(row, startIndex, 6);
                }
            });
        },

        createHighlightBox(row, startCol, endCol) {
            const box = document.createElement('div');
            box.className = 'highlight-box';

            const cellWidthPercent = 100 / 7;
            const leftOffset = (startCol * cellWidthPercent) + 1.5;
            const widthScale = ((endCol - startCol + 1) * cellWidthPercent) - 3;

            box.style.left = `${leftOffset}%`;
            box.style.width = `${widthScale}%`;
            row.appendChild(box);
        },

        updateSummaryText() {
            this.summaryRestDays.textContent = `${this.selectedDays.size} 天`;
        },

        async exportImage() {
            const originalText = this.downloadButton.textContent;
            this.downloadButton.textContent = calendarConfig.exportLoadingText;
            this.downloadButton.disabled = true;

            try {
                const canvas = await html2canvas(this.captureArea, {
                    scale: calendarConfig.exportScale,
                    backgroundColor: null,
                    useCORS: true
                });

                triggerDownload(
                    `${calendarConfig.exportFileNamePrefix}-${this.currentYear}年${this.currentMonth}月.png`,
                    canvas.toDataURL('image/png')
                );
                showToast(calendarConfig.exportSuccessToast);
            } catch (error) {
                showToast(calendarConfig.exportErrorToast, true);
                console.error(error);
            } finally {
                this.downloadButton.textContent = originalText;
                this.downloadButton.disabled = false;
            }
        }
    };
})();
