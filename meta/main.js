import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';


let xScale, yScale;

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
  
    return data;
  }
  

  function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/vdanielb/html-practice/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
          value: lines,
          enumerable: false,
          writable: false,
          configurable: false,
          // What other options do we need to set?
          // Hint: look up configurable, writable, and enumerable
        });
  
        return ret;
      });
  }

function updateCommitInfo(data, commits) {
  // Clear existing stats
  d3.select('#stats').html('');
  
  // Filter data to match the commit time range
  const filteredData = data.filter(d => d.datetime <= commitMaxTime);
  
  const card = d3.select('#stats').append('div').attr('class', 'stats-card');
  const dl = card.append('dl').attr('class', 'stats');

  function addStat(label, value) {
      const block = dl.append('div').attr('class', 'stat-block-meta');
      block.append('dt').html(label);
      block.append('dd').text(value);
  }

  addStat('Total <abbr title="Lines of code">LOC</abbr>', filteredData.length);
  addStat('Total commits', commits.length);

  const uniqueLangs = new Set(filteredData.map(d => d.type)).size;
  addStat('Languages used', uniqueLangs);

  const dayFormat = d3.timeFormat('%A');
  const daysCount = d3.rollups(
      commits,
      v => v.length,
      d => dayFormat(d.datetime)
  );
  const mostFrequentDay = d3.greatest(daysCount, ([, count]) => count)[0];
  addStat('Day with most commits', mostFrequentDay);

  const fileGroups = d3.groups(filteredData, d => d.file);
  const fileLengths = fileGroups.map(([file, lines]) => {
      const uniqueLines = new Set(lines.map(d => d.line));
      return {
          file: file,
          length: uniqueLines.size
      };
  });
  const longestFile = d3.greatest(fileLengths, d => d.length);
  addStat('Longest file', `${longestFile.file} (${longestFile.length} lines)`);
}

let data = await loadData();
let commits = processCommits(data);
let filteredCommits = commits;
let commitProgress = 100;
let timeScale = d3.scaleTime(
  [d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)],
  [0, 100],
);
let commitMaxTime = timeScale.invert(commitProgress);
updateCommitInfo(data, commits);

function createBrushSelector(svg) {
  // Define the extent of the brush to match the usable area
  const brush = d3.brush()
    .extent([
      [xScale.range()[0], yScale.range()[1]], // Top-left corner
      [xScale.range()[1], yScale.range()[0]], // Bottom-right corner
    ])
    .on('start brush end', (event) => brushed(event, xScale, yScale));

  // Append the brush to the SVG
  svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  // Raise dots and everything after the overlay
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// Create SVG and axes only once
const width = 1000;
const height = 600;
const margin = { top: 10, right: 10, bottom: 30, left: 20 };
const usableArea = {
  top: margin.top,
  right: width - margin.right,
  bottom: height - margin.bottom,
  left: margin.left,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
};

let svg = d3.select('#chart svg');
if (svg.empty()) {
  svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Axes and gridlines
  svg.append('g').attr('class', 'gridlines').attr('transform', `translate(${usableArea.left}, 0)`);
  svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0, ${usableArea.bottom})`);
  svg.append('g').attr('class', 'y-axis').attr('transform', `translate(${usableArea.left}, 0)`);
  svg.append('g').attr('class', 'dots');
}

function updateScatterPlot(data, filteredCommits) {
  // Update scales
  xScale = d3
    .scaleTime()
    .domain(d3.extent(filteredCommits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();
  yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

  // Update axes and gridlines
  svg.select('.gridlines').call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
  svg.select('.x-axis').call(d3.axisBottom(xScale));
  svg.select('.y-axis').call(d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00'));

  // Clear and re-add brush
  svg.selectAll('.brush').remove();
  createBrushSelector(svg);

  // Prepare data
  const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);
  const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // Data join for circles
  const dots = svg.select('.dots');
  const circles = dots.selectAll('circle')
    .data(sortedCommits, d => d.id);

  // EXIT
  circles.exit()
    .transition()
    .duration(150)
    .attr('r', 0)
    .attr('opacity', 0)
    .remove();

  // UPDATE
  circles.transition()
    .duration(150)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('opacity', 0.7)
    .attr('fill', 'steelblue');

  // ENTER
  circles.enter()
    .append('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', 0)
    .attr('fill', 'steelblue')
    .attr('opacity', 0)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    })
    .transition()
    .duration(150)
    .attr('r', d => rScale(d.totalLines))
    .attr('opacity', 0.7);
}

updateScatterPlot(data, commits);

function renderTooltipContent(commit) {
  const tooltip = document.getElementById('commit-tooltip');
  if (Object.keys(commit).length === 0) {
    tooltip.style.display = 'none';
    return;
  }

  tooltip.style.display = 'block';

  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleDateString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    timeStyle: 'short',
  });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 5}px`;
  tooltip.style.top = `${event.clientY + 5}px`;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  //return true if commit is within brushSelection
  const [x0, x1] = selection.map((d) => d[0]); 
  const [y0, y1] = selection.map((d) => d[1]); 
  const x = xScale(commit.datetime); 
  const y = yScale(commit.hourFrac); 
  return x >= x0 && x <= x1 && y >= y0 && y <= y1; 
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt><b>${language}</b></dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}


/*filter animation*/


const timeSlider = document.getElementById('progress-slider');
const selectedTime = document.getElementById('selectedTime');

function filterCommitsByTime() {
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
}

function updateTimeDisplay() {
  commitProgress = Number(timeSlider.value); // Get slider value
  commitMaxTime = timeScale.invert(commitProgress); // Update commitMaxTime based on slider value
  selectedTime.textContent = commitMaxTime.toLocaleString();
  filterCommitsByTime(); // filters by time and assign to some top-level variable.
  updateScatterPlot(data, filteredCommits);
  updateCommitInfo(data, filteredCommits); // Update commit info with filtered data
}

// timeSlider.addEventListener('input', updateTimeDisplay);
// function updateSliderBackground() {
//   timeSlider.style.setProperty('--progress', timeSlider.value);
// }
// timeSlider.addEventListener('input', updateSliderBackground);
// updateSliderBackground();
// updateTimeDisplay();

function updateFileDisplay(filteredCommits) {
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);


  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      // This code only runs when the div is initially rendered
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.append('dd');
        }),
    )
    .attr('style', (d) => `--color: ${colors(d.type)}`);

  filesContainer.select('dt > code').html((d) => d.name + '<small>' + d.lines.length + ' lines</small>');
  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', d => `background: ${colors(d.type)}`);
};

updateFileDisplay(filteredCommits);
// timeSlider.addEventListener('input', () => updateFileDisplay(filteredCommits));

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );

function onStepEnter(response) {
  commitMaxTime = response.element.__data__.datetime;
  filterCommitsByTime();
  updateFileDisplay(filteredCommits);
  updateScatterPlot(data, filteredCommits);
  console.log(response.element.__data__.datetime);
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);