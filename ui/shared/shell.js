(function initInternalShellNavigation() {
  function applyActiveNav() {
    const navLinks = Array.from(document.querySelectorAll('.nav-link[data-nav-route]'));
    if (navLinks.length === 0) {
      return;
    }

    const route = String(document.body?.dataset?.route || '').trim();
    const activeRoute = route;

    navLinks.forEach((link) => {
      const linkRoute = String(link.dataset.navRoute || '').trim();
      link.classList.toggle('is-active', linkRoute === activeRoute);
      if (linkRoute === activeRoute) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', applyActiveNav);
})();
