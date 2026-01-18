/**
 * 高雄捷運碳排放計算器 - 前端控制器
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const originSelect = document.getElementById('originStation');
    const destSelect = document.getElementById('destStation');
    const swapBtn = document.getElementById('swapStations');
    const calculateBtn = document.getElementById('calculateBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const carbonResult = document.getElementById('carbonResult');
    const historyCount = document.getElementById('historyCount');

    // 初始化：載入站點資料
    initStations();

    // 事件監聽
    swapBtn.addEventListener('click', swapStations);
    calculateBtn.addEventListener('click', handleCalculate);
    exportCSVBtn.addEventListener('click', () => CarbonCalculator.exportToCSV());

    /**
     * 初始化站點下拉選單
     */
    async function initStations() {
        try {
            const stations = await CarbonCalculator.loadStations();

            // 整理站點資料（依路線分組）
            const stationsByLine = groupStationsByLine(stations);

            // 填充下拉選單
            populateStationSelect(originSelect, stationsByLine);
            populateStationSelect(destSelect, stationsByLine);

            // 啟用控制項
            originSelect.disabled = false;
            destSelect.disabled = false;
            calculateBtn.disabled = false;

        } catch (error) {
            console.error('初始化失敗:', error);
            originSelect.innerHTML = '<option value="">載入失敗，請重新整理</option>';
            destSelect.innerHTML = '<option value="">載入失敗，請重新整理</option>';
        }
    }

    /**
     * 依路線分組站點
     */
    function groupStationsByLine(stations) {
        const groups = {
            'R': { name: '紅線 Red Line', stations: [] },
            'O': { name: '橘線 Orange Line', stations: [] },
            'C': { name: '環狀輕軌 Circular LRT', stations: [] },
            'other': { name: '其他', stations: [] }
        };

        stations.forEach(station => {
            const lineCode = station.StationID?.charAt(0) || 'other';
            const group = groups[lineCode] || groups['other'];
            group.stations.push({
                id: station.StationID,
                name: station.StationName?.Zh_tw || station.StationID,
                nameEn: station.StationName?.En || ''
            });
        });

        // 移除空的分組
        Object.keys(groups).forEach(key => {
            if (groups[key].stations.length === 0) {
                delete groups[key];
            }
        });

        return groups;
    }

    /**
     * 填充站點下拉選單
     */
    function populateStationSelect(select, stationsByLine) {
        select.innerHTML = '<option value="">請選擇站點</option>';

        Object.entries(stationsByLine).forEach(([lineCode, lineData]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = lineData.name;

            lineData.stations.forEach(station => {
                const option = document.createElement('option');
                option.value = station.id;
                option.textContent = `${station.name} (${station.id})`;
                optgroup.appendChild(option);
            });

            select.appendChild(optgroup);
        });
    }

    /**
     * 交換起迄站
     */
    function swapStations() {
        const temp = originSelect.value;
        originSelect.value = destSelect.value;
        destSelect.value = temp;
    }

    /**
     * 處理計算
     */
    async function handleCalculate() {
        const originId = originSelect.value;
        const destId = destSelect.value;

        if (!originId || !destId) {
            alert('請選擇起站與迄站');
            return;
        }

        if (originId === destId) {
            alert('起站與迄站不能相同');
            return;
        }

        // 顯示載入狀態
        setCalculating(true);

        try {
            const result = await CarbonCalculator.calculate(originId, destId);

            // 加入歷史紀錄
            CarbonCalculator.addToHistory(result);
            updateHistoryCount();

            // 顯示結果
            displayResult(result);

        } catch (error) {
            console.error('計算失敗:', error);
            alert('計算失敗：' + error.message);
        } finally {
            setCalculating(false);
        }
    }

    /**
     * 顯示計算結果
     */
    function displayResult(result) {
        // 路線資訊
        document.getElementById('resultOrigin').textContent = result.origin.name;
        document.getElementById('resultDest').textContent = result.destination.name;
        document.getElementById('resultDistance').textContent = result.distance.toFixed(2);

        // 碳排放數據
        const emissions = result.emissions;

        document.getElementById('metroEmission').textContent = emissions.metro.emission.toFixed(1);
        document.getElementById('carEmission').textContent = emissions.car.emission.toFixed(1);
        document.getElementById('motorcycleEmission').textContent = emissions.motorcycle.emission.toFixed(1);

        // 省碳量（負數表示捷運反而排放更多）
        const carSaved = emissions.car.saved;
        const mcSaved = emissions.motorcycle.saved;

        const carSavedEl = document.getElementById('carSaved');
        const mcSavedEl = document.getElementById('motorcycleSaved');

        if (carSaved > 0) {
            carSavedEl.textContent = `省 ${carSaved.toFixed(1)}g`;
            carSavedEl.className = 'saved-badge positive';
        } else {
            carSavedEl.textContent = `多 ${Math.abs(carSaved).toFixed(1)}g`;
            carSavedEl.className = 'saved-badge negative';
        }

        if (mcSaved > 0) {
            mcSavedEl.textContent = `省 ${mcSaved.toFixed(1)}g`;
            mcSavedEl.className = 'saved-badge positive';
        } else {
            mcSavedEl.textContent = `多 ${Math.abs(mcSaved).toFixed(1)}g`;
            mcSavedEl.className = 'saved-badge negative';
        }

        // 等效比較
        document.getElementById('treeDays').textContent = emissions.equivalents.treeDays;
        document.getElementById('phoneCharges').textContent = emissions.equivalents.smartphoneCharges;

        // 顯示結果區域
        carbonResult.classList.remove('hidden');
        carbonResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * 設定計算中狀態
     */
    function setCalculating(isCalculating) {
        if (isCalculating) {
            calculateBtn.classList.add('loading');
            calculateBtn.disabled = true;
        } else {
            calculateBtn.classList.remove('loading');
            calculateBtn.disabled = false;
        }
    }

    /**
     * 更新歷史記錄數
     */
    function updateHistoryCount() {
        const count = CarbonCalculator.getHistory().length;
        historyCount.textContent = `已記錄 ${count} 筆`;
    }
});
