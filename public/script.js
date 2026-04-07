// This script handles the opening and closing of the mobile menu
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    // Toggle the "show" class when clicking the hamburger
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('show');
    });

    // Optional: Close the menu if a user clicks a link
    const menuLinks = document.querySelectorAll('.menu li');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('show');
        });
    });
});