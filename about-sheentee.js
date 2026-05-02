// about-sheentee.js

document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('.footer.fixed-footer');
    if (footer) {
        const div = document.createElement('div');
        div.className = 'footer-info';
        div.textContent = 'Get more information about Sheentee Extensions ';
        
        const a = document.createElement('a');
        a.href = 'https://github.com/Sheentee/.github/blob/main/README.md';
        a.target = '_blank';
        a.textContent = 'Here';
        
        div.appendChild(a);
        footer.appendChild(div);
    }
});
