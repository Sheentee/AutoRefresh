// about-sheentee.js

document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('.footer.fixed-footer');
    if (footer) {
        footer.innerHTML = `
            <div class="footer-info">
                Get more information about Sheentee Extensions 
                <a href="https://github.com/Sheentee/.github/blob/main/README.md" target="_blank">Here</a>
            </div>
        `;
    }
});
