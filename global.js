console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// NAV BAR
let pages = [
  { url: '', title: 'Home' },
  { url: 'contact/', title: 'Contact' },
  { url: 'projects/', title: 'Projects' },
  { url: 'https://github.com/vdanielb', title: 'GitHub' },
  { url: 'resume/', title: 'Resume' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/html-practice/";         // GitHub Pages repo name

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);
  
  // detect current page
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  // all external links go to new tab
  if (a.host !== location.host) { 
    a.target = '_blank';
  } 
}



// LIGHT DARK MODE
document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
      <option value="light dark">Auto</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
		</select>
	</label>`,
);

function setColorScheme(scheme) {
  document.documentElement.style.setProperty('color-scheme', scheme);
  localStorage.colorScheme = scheme;
  select.value = localStorage.colorScheme;
}

let select = document.querySelector('.color-scheme select');

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
} else {
  setColorScheme('light');
}

select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  setColorScheme(event.target.value)
});