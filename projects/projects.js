import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

// header
const header = document.querySelector('h1');
header.innerHTML = `${Object.keys(projects).length} Projects`;

// projects
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

