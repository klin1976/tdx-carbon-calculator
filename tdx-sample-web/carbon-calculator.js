/**
 * 高雄捷運碳排放計算器
 * 使用 TDX API 取得站點與里程資料，計算碳排放量
 */

// 碳排放係數 (gCO2e/人公里)
const EMISSION_FACTORS = {
    krtcMetro: 220,      // 高雄捷運 (2023年官方認證)
    car: 150,            // 小客車 (台灣平均)
    motorcycle: 88,      // 機車 (台灣平均)
    bus: 80,             // 公車 (參考值)
};

// 快取資料
let stationsCache = null;
let odFareCache = null;

/**
 * 載入高雄捷運站點資料
 */
async function loadKRTCStations() {
    if (stationsCache) return stationsCache;
    
    try {
        const params = new URLSearchParams({
            endpoint: '/v2/Rail/Metro/Station/KRTC',
            '$format': 'JSON'
        });
        
        const response = await fetch(`/api/proxy?${params.toString()}`);
        if (!response.ok) throw new Error('無法載入站點資料');
        
        const data = await response.json();
        stationsCache = data;
        return data;
    } catch (error) {
        console.error('載入站點失敗:', error);
        throw error;
    }
}

/**
 * 載入高雄捷運 OD 票價/里程資料
 */
async function loadKRTCODFare() {
    if (odFareCache) return odFareCache;
    
    try {
        const params = new URLSearchParams({
            endpoint: '/v2/Rail/Metro/ODFare/KRTC',
            '$format': 'JSON'
        });
        
        const response = await fetch(`/api/proxy?${params.toString()}`);
        if (!response.ok) throw new Error('無法載入票價/里程資料');
        
        const data = await response.json();
        odFareCache = data;
        return data;
    } catch (error) {
        console.error('載入票價/里程失敗:', error);
        throw error;
    }
}

/**
 * 查詢兩站之間的資訊
 * @param {string} originStationId - 起站 ID
 * @param {string} destStationId - 迄站 ID
 * @returns {Object} 包含里程、票價等資訊
 */
async function getODInfo(originStationId, destStationId) {
    const odFareData = await loadKRTCODFare();
    
    // 在 ODFare 資料中尋找對應的起迄站組合
    for (const od of odFareData) {
        if (od.OriginStationID === originStationId && 
            od.DestinationStationID === destStationId) {
            return {
                distance: od.Distance || 0,   // 距離 (公里)
                price: od.Fares?.[0]?.Price || 0,  // 票價
                found: true
            };
        }
    }
    
    // 嘗試反向查詢
    for (const od of odFareData) {
        if (od.OriginStationID === destStationId && 
            od.DestinationStationID === originStationId) {
            return {
                distance: od.Distance || 0,
                price: od.Fares?.[0]?.Price || 0,
                found: true
            };
        }
    }
    
    return { distance: 0, price: 0, found: false };
}

/**
 * 計算碳排放量
 * @param {number} distanceKm - 距離 (公里)
 * @returns {Object} 各種交通方式的碳排放量與比較
 */
function calculateEmissions(distanceKm) {
    const metroEmission = distanceKm * EMISSION_FACTORS.krtcMetro;
    const carEmission = distanceKm * EMISSION_FACTORS.car;
    const motorcycleEmission = distanceKm * EMISSION_FACTORS.motorcycle;
    const busEmission = distanceKm * EMISSION_FACTORS.bus;
    
    return {
        metro: {
            emission: metroEmission,
            label: '高雄捷運'
        },
        car: {
            emission: carEmission,
            saved: carEmission - metroEmission,
            label: '小客車'
        },
        motorcycle: {
            emission: motorcycleEmission,
            saved: motorcycleEmission - metroEmission,
            label: '機車'
        },
        bus: {
            emission: busEmission,
            saved: busEmission - metroEmission,
            label: '公車'
        },
        distance: distanceKm,
        // 等效比較
        equivalents: {
            treeDays: (metroEmission / 21.667).toFixed(1),  // 一棵樹每天吸收約 21.667g CO2
            smartphoneCharges: Math.round(metroEmission / 8.22), // 每次充電約 8.22g CO2
        }
    };
}

/**
 * 完整的碳排放計算
 * @param {string} originStationId - 起站 ID
 * @param {string} destStationId - 迄站 ID
 * @returns {Object} 完整計算結果
 */
async function calculateCarbonFootprint(originStationId, destStationId) {
    const stations = await loadKRTCStations();
    const odInfo = await getODInfo(originStationId, destStationId);
    
    // 找出站名
    const originStation = stations.find(s => s.StationID === originStationId);
    const destStation = stations.find(s => s.StationID === destStationId);
    
    if (!odInfo.found || odInfo.distance === 0) {
        // 如果找不到 ODFare 資料，嘗試用經緯度估算
        if (originStation && destStation) {
            const dist = haversineDistance(
                originStation.StationPosition.PositionLat,
                originStation.StationPosition.PositionLon,
                destStation.StationPosition.PositionLat,
                destStation.StationPosition.PositionLon
            );
            odInfo.distance = dist * 1.2; // 乘以 1.2 作為軌道曲折係數
            odInfo.estimated = true;
        }
    }
    
    const emissions = calculateEmissions(odInfo.distance);
    
    return {
        origin: {
            id: originStationId,
            name: originStation?.StationName?.Zh_tw || originStationId
        },
        destination: {
            id: destStationId,
            name: destStation?.StationName?.Zh_tw || destStationId
        },
        distance: odInfo.distance,
        distanceEstimated: odInfo.estimated || false,
        price: odInfo.price,
        emissions: emissions,
        timestamp: new Date().toISOString()
    };
}

/**
 * Haversine 公式計算兩點間距離 (公里)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半徑 (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * 計算歷史記錄
 */
let calculationHistory = [];

function addToHistory(result) {
    calculationHistory.push(result);
    // 最多保留 50 筆
    if (calculationHistory.length > 50) {
        calculationHistory.shift();
    }
}

function getHistory() {
    return calculationHistory;
}

function clearHistory() {
    calculationHistory = [];
}

/**
 * 匯出為 CSV
 */
function exportToCSV() {
    if (calculationHistory.length === 0) {
        alert('目前沒有計算記錄可匯出');
        return;
    }
    
    const headers = ['日期時間', '起站', '迄站', '距離(km)', '碳排放(gCO2e)', '票價(TWD)', '省碳vs開車(gCO2e)', '省碳vs機車(gCO2e)'];
    
    const rows = calculationHistory.map(r => [
        new Date(r.timestamp).toLocaleString('zh-TW'),
        r.origin.name,
        r.destination.name,
        r.distance.toFixed(2),
        r.emissions.metro.emission.toFixed(1),
        r.price || 'N/A',
        r.emissions.car.saved.toFixed(1),
        r.emissions.motorcycle.saved.toFixed(1)
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    // 加入 BOM 以支援中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `高雄捷運碳排放記錄_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
}

// 匯出模組 (供其他檔案使用)
window.CarbonCalculator = {
    loadStations: loadKRTCStations,
    loadODFare: loadKRTCODFare,
    calculate: calculateCarbonFootprint,
    addToHistory,
    getHistory,
    clearHistory,
    exportToCSV,
    EMISSION_FACTORS
};
