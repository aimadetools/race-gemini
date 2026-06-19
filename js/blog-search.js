document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('blog-search-input');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const blogArticles = document.querySelectorAll('.blog-preview');

    let currentCategory = 'all';
    let currentSearchTerm = '';

    function filterArticles() {
        blogArticles.forEach(article => {
            const titleElement = article.querySelector('h2 a');
            const descElement = article.querySelector('.blog-desc');
            
            const title = titleElement ? titleElement.textContent.toLowerCase() : '';
            const description = descElement ? descElement.textContent.toLowerCase() : '';
            const category = article.getAttribute('data-category') || 'all';

            const matchesSearch = title.includes(currentSearchTerm) || description.includes(currentSearchTerm);
            const matchesCategory = currentCategory === 'all' || category === currentCategory;

            if (matchesSearch && matchesCategory) {
                article.style.display = ''; // Show article
            } else {
                article.style.display = 'none'; // Hide article
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', function(event) {
            currentSearchTerm = event.target.value.toLowerCase();
            filterArticles();
        });
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.getAttribute('data-category');
            filterArticles();
        });
    });
});
