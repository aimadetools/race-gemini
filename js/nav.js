document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.getElementById('nav-links');
    const token = localStorage.getItem('token');

    if (token) {
        const dashboardLi = document.createElement('li');
        dashboardLi.innerHTML = '<a href="/dashboard.html">Dashboard</a>';
        navLinks.appendChild(dashboardLi);

        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = '<a href="#" id="logout-link">Logout</a>';
        navLinks.appendChild(logoutLi);

        const logoutLink = document.getElementById('logout-link');
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            window.location.href = '/auth.html';
        });
    } else {
        const loginLi = document.createElement('li');
        loginLi.innerHTML = '<a href="/auth.html">Login/Signup</a>';
        navLinks.appendChild(loginLi);
    }
});