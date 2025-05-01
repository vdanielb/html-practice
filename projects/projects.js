import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let selectedIndex = -1;

function renderPieChart(projectsGiven) {
    // re-calculate rolled data
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );
    // re-calculate data
    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });
    // re-calculate slice generator, arc data, arc, etc.
    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => arcGenerator(d));
    // clear up paths and legends
    d3.select('#projects-plot').selectAll('path').remove();
    d3.select('.legend').selectAll('li').remove();
    // update paths and legends
    let colors = d3.scaleOrdinal(d3.schemePaired);
    newArcs.forEach((arc, idx) => {
        let path = d3.select('#projects-plot')
            .append('path')
            .attr('d', arc)
            .attr('fill', colors(idx))
            .attr('data-index', idx)
            .style('opacity', selectedIndex === -1 ? 1 : (idx === selectedIndex ? 1 : 0.5))
            .on('mouseover', function () {
                if (selectedIndex === -1 || selectedIndex === idx) {
                    // highlight hovered slice and legend
                    d3.select(this).style('fill', '#ed713a');
                    d3.select(`.legend-item[data-index="${idx}"]`).classed('highlighted', true);
                }
                // opacity 0.5 for non selected slices
                if (selectedIndex === -1) {
                    d3.selectAll('#projects-plot path')
                        .filter((_, i) => i !== idx)
                        .style('opacity', 0.5);
                }
            })
            .on('mouseout', function () {
                if (selectedIndex === -1 || selectedIndex !== idx) {
                    // reset colors and opacity when mouse out
                    d3.select(this).style('fill', colors(idx));
                    d3.select(`.legend-item[data-index="${idx}"]`).classed('highlighted', false);
                }
                // reset opacity when non selected
                if (selectedIndex === -1) {
                    d3.selectAll('#projects-plot path').style('opacity', 1);
                }
            })
            .on('click', function () {
                if (selectedIndex === idx) {
                    // if the selected slice is the current slice, reset selection
                    selectedIndex = -1;
                    d3.selectAll('#projects-plot path')
                        .classed('selected', false)
                        .style('fill', (_, i) => colors(i))
                        .style('opacity', 1);
                    d3.selectAll('.legend-item').classed('highlighted', false);

                    // filter based on the current search query
                    let filteredProjects = projects.filter((project) => {
                        let values = Object.values(project).join('\n').toLowerCase();
                        return values.includes(query.toLowerCase());
                    });
                    renderProjects(filteredProjects, projectsContainer, 'h2');
                } else {
                    // select slice and update colors n stuff
                    selectedIndex = idx;
                    d3.selectAll('#projects-plot path')
                        .classed('selected', false)
                        .style('opacity', 0.5)
                        .style('fill', (_, i) => colors(i));
                    d3.select(this)
                        .classed('selected', true)
                        .style('fill', '#ed713a')
                        .style('opacity', 1);

                    // highlight selected legend
                    d3.selectAll('.legend-item').classed('highlighted', false);
                    d3.select(`.legend-item[data-index="${idx}"]`).classed('highlighted', true);

                    // filter based on clicked slice
                    let filteredProjects = projectsGiven.filter(
                        (project) => project.year === newData[idx].label
                    );

                    renderProjects(filteredProjects, projectsContainer, 'h2');
                }
            });
    });

    let legend = d3.select('.legend');
    newData.forEach((d, idx) => {
        legend
            .append('li')
            .attr('class', 'legend-item')
            .attr('data-index', idx)
            .attr('style', `display: flex; align-items: center; gap: 0.5em`)
            .html(`
                <span style="
                    width: 0.8em;
                    height: 0.8em;
                    background-color: ${colors(idx)};
                    border-radius: 50%;
                    display: inline-block;
                "></span>
                ${d.label} <em>(${d.value})</em>
            `);
    });
}

renderPieChart(projects);

// header
const header = document.querySelector('h1');
header.innerHTML = `${Object.keys(projects).length} Projects`;

// projects
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

let query = '';
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
    // update query value
    query = event.target.value;
    // filter projects
    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });
    // render filtered projects
    renderPieChart(filteredProjects);
    renderProjects(filteredProjects, projectsContainer, 'h2');
});