document.addEventListener('DOMContentLoaded', () => {
    const plannerForm = document.getElementById('planner-form');
    const researchService = document.getElementById('research-service');
    const researchTown = document.getElementById('research-town');
    const loader = document.getElementById('planner-loader');
    const emptyState = document.getElementById('planner-empty');
    const resultsSection = document.getElementById('planner-results');
    const keywordsTableBody = document.getElementById('keywords-table-body');
    const lockPanel = document.getElementById('lock-panel');
    const leadForm = document.getElementById('lead-capture-form');
    const leadEmail = document.getElementById('lead-email');
    const leadName = document.getElementById('lead-name');
    const exportBtn = document.getElementById('export-csv-btn');
    const generatePagesBtn = document.getElementById('generate-pages-btn');

    let allKeywords = [];
    let isUnlocked = localStorage.getItem('localleads_keywords_unlocked') === 'true';

    plannerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const service = researchService.value.trim();
        const town = researchTown.value.trim();

        if (!service || !town) return;

        // Reset UI
        emptyState.style.display = 'none';
        resultsSection.style.display = 'none';
        loader.style.display = 'flex';
        allKeywords = [];

        try {
            const response = await fetch('/api/public-suggest-keywords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ service, town })
            });

            if (response.ok) {
                const data = await response.json();
                allKeywords = data.keywords || [];
                renderKeywords();
                loader.style.display = 'none';
                resultsSection.style.display = 'block';
            } else {
                alert('Failed to generate keywords. Please try again.');
                loader.style.display = 'none';
                emptyState.style.display = 'block';
            }
        } catch (err) {
            console.error('Error suggesting keywords:', err);
            alert('A network error occurred. Please check your connection.');
            loader.style.display = 'none';
            emptyState.style.display = 'block';
        }
    });

    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = leadEmail.value.trim();
        const name = leadName.value.trim();
        const service = researchService.value.trim();
        const town = researchTown.value.trim();

        if (!email || !name) return;

        const unlockBtn = document.getElementById('unlock-btn');
        const originalBtnHtml = unlockBtn.innerHTML;
        unlockBtn.disabled = true;
        unlockBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlocking...';

        try {
            const trackingUrl = `https://www.localseogen.com/local-keyword-planner.html?service=${encodeURIComponent(service)}&town=${encodeURIComponent(town)}`;
            await fetch('/api/capture-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    name: name,
                    url: trackingUrl,
                    source: 'local-keyword-planner'
                })
            });

            // Unlock and store status
            isUnlocked = true;
            localStorage.setItem('localleads_keywords_unlocked', 'true');
            
            // Re-render and hide lock panel
            renderKeywords();
        } catch (err) {
            console.error('Failed to capture lead:', err);
        } finally {
            unlockBtn.disabled = false;
            unlockBtn.innerHTML = originalBtnHtml;
        }
    });

    if (generatePagesBtn) {
        generatePagesBtn.addEventListener('click', () => {
            if (!isUnlocked) return;
            const service = researchService.value.trim();
            const town = researchTown.value.trim();
            if (service && town) {
                window.location.href = `/generate.html?services=${encodeURIComponent(service)}&towns=${encodeURIComponent(town)}`;
            }
        });
    }

    exportBtn.addEventListener('click', () => {
        if (!isUnlocked) return;
        const service = researchService.value.trim() || 'local';
        const town = researchTown.value.trim() || 'keywords';
        
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Keyword,Search Intent,Search Volume,Explanation\n';

        allKeywords.forEach(kw => {
            const queryEscaped = kw.query.replace(/"/g, '""');
            const intentEscaped = kw.intent.replace(/"/g, '""');
            const volumeEscaped = kw.volume.replace(/"/g, '""');
            const expEscaped = kw.explanation.replace(/"/g, '""');
            csvContent += `"${queryEscaped}","${intentEscaped}","${volumeEscaped}","${expEscaped}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `local_keywords_${service}_${town}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    function renderKeywords() {
        keywordsTableBody.innerHTML = '';
        
        // Show all if unlocked, else show first 3
        const visibleKeywords = isUnlocked ? allKeywords : allKeywords.slice(0, 3);
        
        visibleKeywords.forEach(kw => {
            const tr = document.createElement('tr');
            
            let intentBadgeClass = 'intent-info';
            if (kw.intent === 'Transactional') intentBadgeClass = 'intent-transactional';
            else if (kw.intent === 'Commercial') intentBadgeClass = 'intent-commercial';
            
            let volumeBadgeClass = 'vol-medium';
            if (kw.volume === 'High') volumeBadgeClass = 'vol-high';
            else if (kw.volume === 'Low') volumeBadgeClass = 'vol-low';

            tr.innerHTML = `
                <td style="font-weight: 700; color: #fff;">${kw.query}</td>
                <td><span class="badge ${intentBadgeClass}">${kw.intent}</span></td>
                <td><span class="badge ${volumeBadgeClass}">${kw.volume}</span></td>
                <td style="color: #9ca3af; font-size: 0.9rem; line-height: 1.4;">${kw.explanation}</td>
            `;
            keywordsTableBody.appendChild(tr);
        });

        // Add blurred placeholder rows if locked
        if (!isUnlocked && allKeywords.length > 3) {
            for (let i = 0; i < 5; i++) {
                const tr = document.createElement('tr');
                tr.classList.add('blurred-row');
                tr.innerHTML = `
                    <td style="font-weight: 700; color: #4b5563;">••••••••••••••••••••</td>
                    <td><span class="badge vol-low" style="opacity: 0.3;">••••••</span></td>
                    <td><span class="badge vol-low" style="opacity: 0.3;">••••</span></td>
                    <td style="color: #4b5563; font-size: 0.9rem;">••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••</td>
                `;
                keywordsTableBody.appendChild(tr);
            }
            lockPanel.style.display = 'block';
            exportBtn.style.display = 'none';
            if (generatePagesBtn) generatePagesBtn.style.display = 'none';
        } else {
            lockPanel.style.display = 'none';
            exportBtn.style.display = 'inline-flex';
            if (generatePagesBtn) generatePagesBtn.style.display = 'inline-flex';
        }
    }
});
