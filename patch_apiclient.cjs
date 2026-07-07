const fs = require('fs');
let file = fs.readFileSync('src/utils/apiClient.ts', 'utf8');

if (!file.includes('show-api-setup')) {
    file = file.replace(/const retryableStatuses = \[429, 500, 502, 503, 504\];/, `if (response.status === 402) {
         window.dispatchEvent(new CustomEvent('show-api-setup'));
         throw new Error('API_SETUP_REQUIRED: Yêu cầu thiết lập Personal API Key.');
      }
      const retryableStatuses = [429, 500, 502, 503, 504];`);
    fs.writeFileSync('src/utils/apiClient.ts', file);
}

