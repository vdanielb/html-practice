import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

const githubData = await fetchGitHubData('vdanielb');
const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
    profileStats.innerHTML = `
      <div class="dashboard-grid">
        <div class="github-card refined-layout">
          <div class="card-inner">
            <div class="card-header">My GitHub Stats</div>
            <div class="card-content">
              <div class="profile-section">
                <img class="avatar" src="${githubData.avatar_url}" alt="GitHub Avatar">
                <a class="username" href="https://github.com/${githubData.login}" target="_blank">@${githubData.login}</a>
                <a class="gh-link" href="https://github.com/${githubData.login}" target="_blank" title="View GitHub Profile">
                  <img src="https://img.icons8.com/ios-filled/50/github.png" alt="GitHub Icon"/>
                </a>
              </div>
              <div class="stats-grid">
                <div class="stat-block"><div class="stat-number">${githubData.followers}</div><div class="stat-label">Followers</div></div>
                <div class="stat-block"><div class="stat-number">${githubData.following}</div><div class="stat-label">Following</div></div>
                <div class="stat-block"><div class="stat-number">${githubData.public_repos}</div><div class="stat-label">Public Repos</div></div>
                <div class="stat-block"><div class="stat-number">${githubData.public_gists}</div><div class="stat-label">Public Gists</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  