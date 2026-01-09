document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetchBtn');
    const endpointInput = document.getElementById('endpoint');
    const paramsInput = document.getElementById('params');
    const jsonOutput = document.getElementById('json-output');
    const statusBadge = document.getElementById('status-badge');

    fetchBtn.addEventListener('click', async () => {
        const endpoint = endpointInput.value.trim();
        let params = paramsInput.value.trim();

        if (!endpoint) {
            alert('請輸入 API Path');
            return;
        }

        // 移除開頭的 /api/basic (如果使用者不小心複製貼上的話)
        // 但我們的後端本來就期望接收相對路徑，所以保持原樣或稍微清理即可
        const cleanEndpoint = endpoint.replace(/^\/api\/basic/, '');

        setLoading(true);
        updateStatus('Loading...', 'default');
        jsonOutput.textContent = '請求處理中...';

        try {
            // 構建請求 URL
            // 我們呼叫自己的 Serverless Function: /api/proxy
            // 將原本參數串在 endpoint 後面傳遞，或者分開傳
            // 這裡直接將參數串在 URL 後面傳給後端
            let url = `/api/proxy?endpoint=${encodeURIComponent(cleanEndpoint)}`;

            // 如果這行只是為了讓後端轉發，其實應該解析 params 並重組
            // 為了簡化，Serverless Function 會把 req.query 除了 endpoint 以外的都轉發
            // 所以我們需要把 param string 解析成 object 傳給 fetch? 
            // 不，URLSearchParams 更簡單

            const searchParams = new URLSearchParams(params);
            searchParams.append('endpoint', cleanEndpoint);

            const response = await fetch(`/api/proxy?${searchParams.toString()}`);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
            }

            // 成功
            jsonOutput.textContent = JSON.stringify(data, null, 2);
            updateStatus('Success', 'success');
        } catch (error) {
            console.error('Fetch error:', error);
            jsonOutput.textContent = `Error: ${error.message}`;
            updateStatus('Error', 'error');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            fetchBtn.classList.add('loading');
            fetchBtn.disabled = true;
        } else {
            fetchBtn.classList.remove('loading');
            fetchBtn.disabled = false;
        }
    }

    function updateStatus(text, type) {
        statusBadge.textContent = text;
        statusBadge.className = 'badge'; // reset
        if (type === 'success') statusBadge.classList.add('success');
        if (type === 'error') statusBadge.classList.add('error');
    }
});
