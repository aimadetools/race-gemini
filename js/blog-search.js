document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('blog-search-input');
    const blogArticles = document.querySelectorAll('.blog-preview');

    if (searchInput) {
        searchInput.addEventListener('keyup', function(event) {
            const searchTerm = event.target.value.toLowerCase();

            blogArticles.forEach(article => {
                const title = article.querySelector('h2 a').textContent.toLowerCase();
                const description = article.querySelector('p').textContent.toLowerCase();

                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    article.style.display = ''; // Show article
                } else {
                    article.style.display = 'none'; // Hide article
                }
            });
        });
    }
});
