<script>
  import { onMount, afterUpdate } from 'svelte';
  import * as d3 from 'd3';
  
  export let processedData = null;
  export let onCandidateSelect = () => {};
  export let selectedCandidateIdx = -1;
  
  let svgElement;
  let candidates = [];
  let nodes = [];
  let sortedCandidates = [];
  let sortColumn = null;
  let sortDirection = 'desc';  // 'asc' or 'desc'
  
  const svgWidth = 300;
  const svgHeight = 600;
  const leftX = 40;    // rules列
  const rightX = 260;  // candidates列
  
  $: if (processedData) {
    candidates = processedData.candidates;
    nodes = processedData.nodes;
    sortedCandidates = [...candidates];
    renderBipartiteGraph();
  }
  
  function sortBy(column) {
    if (sortColumn === column) {
      // 切换排序方向
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortColumn = column;
      sortDirection = 'desc';
    }
    
    sortedCandidates = [...candidates].sort((a, b) => {
      let aVal, bVal;
      
      switch(column) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'GT':
          aVal = a.GT ? 1 : 0;
          bVal = b.GT ? 1 : 0;
          break;
        case 'originalSurprisal':
          aVal = a.originalSurprisal;
          bVal = b.originalSurprisal;
          break;
        case 'baseSurprisal':
          aVal = a.baseSurprisal;
          bVal = b.baseSurprisal;
          break;
        case 'newSurprisal':
          aVal = a.newSurprisal;
          bVal = b.newSurprisal;
          break;
        case 'rankBefore':
          aVal = a.rankBefore;
          bVal = b.rankBefore;
          break;
        case 'rankAfter':
          aVal = a.rankAfter;
          bVal = b.rankAfter;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      } else {
        return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
      }
    });
    
    renderBipartiteGraph();
  }
  
  function getCandidateOriginalIndex(candidate) {
    return candidates.indexOf(candidate);
  }
  
  function renderBipartiteGraph() {
    if (!svgElement || !candidates || !nodes) return;
    
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();
    
    // 创建比例尺
    const ruleScale = d3.scaleBand()
      .domain(nodes.map((n, i) => i))
      .range([20, svgHeight - 20])
      .padding(0.1);
    
    const candidateScale = d3.scaleBand()
      .domain(sortedCandidates.map((c, i) => i))
      .range([20, svgHeight - 20])
      .padding(0.1);
    
    // 准备连线数据
    const links = [];
    sortedCandidates.forEach((candidate, candIdx) => {
      candidate.nodes.forEach(nodeIdx => {
        links.push({
          candidateIdx: candIdx,
          nodeIdx: nodeIdx,
          candidateName: candidate.name,
          isGT: candidate.GT
        });
      });
    });
    
    // 绘制连线
    svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('x1', leftX)
      .attr('y1', d => ruleScale(d.nodeIdx) + ruleScale.bandwidth() / 2)
      .attr('x2', rightX)
      .attr('y2', d => candidateScale(d.candidateIdx) + candidateScale.bandwidth() / 2)
      .attr('stroke', d => d.isGT ? '#4caf50' : '#ccc')
      .attr('stroke-width', d => d.isGT ? 2 : 1)
      .attr('opacity', 0.4);
    
    // 绘制rules节点
    svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('cx', leftX)
      .attr('cy', (d, i) => ruleScale(i) + ruleScale.bandwidth() / 2)
      .attr('r', 4)
      .attr('fill', '#2196f3')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    
    // 绘制rules标签
    svg.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('x', leftX - 8)
      .attr('y', (d, i) => ruleScale(i) + ruleScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text((d, i) => `R${i}`);
    
    // 绘制candidates节点
    svg.append('g')
      .selectAll('circle')
      .data(sortedCandidates)
      .join('circle')
      .attr('cx', rightX)
      .attr('cy', (d, i) => candidateScale(i) + candidateScale.bandwidth() / 2)
      .attr('r', d => d.GT ? 6 : 4)
      .attr('fill', d => d.GT ? '#4caf50' : '#ff9800')
      .attr('stroke', (d) => {
        const originalIdx = getCandidateOriginalIndex(d);
        return originalIdx === selectedCandidateIdx ? '#f44336' : '#fff';
      })
      .attr('stroke-width', (d) => {
        const originalIdx = getCandidateOriginalIndex(d);
        return originalIdx === selectedCandidateIdx ? 3 : 1;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        const idx = getCandidateOriginalIndex(d);
        onCandidateSelect(idx);
      });
  }
  
  function handleCandidateClick(candidate) {
    const originalIdx = getCandidateOriginalIndex(candidate);
    onCandidateSelect(originalIdx);
  }
  
  onMount(() => {
    renderBipartiteGraph();
  });
  
  afterUpdate(() => {
    renderBipartiteGraph();
  });
</script>

<div class="bipartite-panel">
  <!-- 二部图 -->
  <div class="bipartite-graph">
    <h3>Rules ↔ Candidates</h3>
    <svg bind:this={svgElement} width={svgWidth} height={svgHeight}></svg>
  </div>
  
  <!-- Candidate信息表格 -->
  <div class="candidate-table">
    <h3>Candidate 信息</h3>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th on:click={() => sortBy('name')} class="sortable">
              Name {sortColumn === 'name' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th on:click={() => sortBy('GT')} class="sortable">
              GT {sortColumn === 'GT' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th on:click={() => sortBy('originalSurprisal')} class="sortable">
              Orig. {sortColumn === 'originalSurprisal' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th on:click={() => sortBy('baseSurprisal')} class="sortable">
              Base {sortColumn === 'baseSurprisal' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th on:click={() => sortBy('newSurprisal')} class="sortable">
              New {sortColumn === 'newSurprisal' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </th>
            <th on:click={() => sortBy('rankAfter')} class="sortable">
              Rank {sortColumn === 'rankAfter' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {#each sortedCandidates as candidate}
            {@const originalIdx = getCandidateOriginalIndex(candidate)}
            <tr 
              class:selected={selectedCandidateIdx === originalIdx}
              class:gt={candidate.GT}
              on:click={() => handleCandidateClick(candidate)}
            >
              <td class="name-cell" title={candidate.name}>
                {candidate.name}
              </td>
              <td class="gt-cell">
                {#if candidate.GT}
                  <span class="gt-badge">✓</span>
                {:else}
                  <span class="no-gt">✗</span>
                {/if}
              </td>
              <td>{candidate.originalSurprisal.toFixed(3)}</td>
              <td>{candidate.baseSurprisal.toFixed(3)}</td>
              <td>{candidate.newSurprisal.toFixed(3)}</td>
              <td>
                {candidate.rankBefore} → {candidate.rankAfter}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .bipartite-panel {
    display: flex;
    height: 100%;
    background: white;
    border-left: 1px solid #dee2e6;
  }
  
  .bipartite-graph {
    padding: 15px;
    background: #f8f9fa;
    border-right: 1px solid #dee2e6;
  }
  
  .bipartite-graph h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
    text-align: center;
  }
  
  .bipartite-graph svg {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }
  
  .candidate-table {
    flex: 1;
    padding: 15px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .candidate-table h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
  }
  
  .table-wrapper {
    flex: 1;
    overflow-y: auto;
    overflow-x: auto;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  
  thead {
    position: sticky;
    top: 0;
    background: #f8f9fa;
    z-index: 10;
  }
  
  th {
    padding: 8px 6px;
    text-align: left;
    font-weight: 600;
    color: #495057;
    border-bottom: 2px solid #dee2e6;
    font-size: 11px;
  }
  
  th.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s;
  }
  
  th.sortable:hover {
    background-color: #e9ecef;
  }
  
  td {
    padding: 8px 6px;
    border-bottom: 1px solid #e9ecef;
  }
  
  tbody tr {
    cursor: pointer;
    transition: background-color 0.15s;
  }
  
  tbody tr:hover {
    background-color: #f1f3f5;
  }
  
  tbody tr.selected {
    background-color: #ffe0e0;
    font-weight: 500;
  }
  
  tbody tr.gt {
    background-color: #e8f5e9;
  }
  
  tbody tr.gt.selected {
    background-color: #c8e6c9;
  }
  
  .name-cell {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .gt-cell {
    text-align: center;
  }
  
  .gt-badge {
    color: #4caf50;
    font-weight: bold;
    font-size: 14px;
  }
  
  .no-gt {
    color: #ccc;
    font-size: 14px;
  }
  
  th:nth-child(2), td:nth-child(2) {
    width: 40px;
    text-align: center;
  }
  
  th:nth-child(3), td:nth-child(3),
  th:nth-child(4), td:nth-child(4),
  th:nth-child(5), td:nth-child(5) {
    width: 60px;
    text-align: right;
  }
  
  th:nth-child(6), td:nth-child(6) {
    width: 80px;
    text-align: center;
  }
</style>
