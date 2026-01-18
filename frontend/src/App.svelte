<script>
  import { onMount } from 'svelte';
  import QueryTable from './components/QueryTable.svelte';
  import DependencyGraphPanel from './components/DependencyGraphPanel.svelte';
  import BipartitePanel from './components/BipartitePanel.svelte';
  import Tooltip from './components/Tooltip.svelte';
  import { loadDataFile, buildQueryIndex, processQueryData } from './lib/dataProcessor.js';
  
  // 应用状态
  let queryIndex = [];
  let allQueries = [];
  let selectedQueryIdx = -1;
  let processedData = null;
  let selectedCandidateIdx = -1;
  let highlightedCandidate = null;
  let loading = true;
  let error = null;
  
  // Tooltip状态
  let tooltipData = {
    visible: false,
    x: 0,
    y: 0,
    content: {}
  };
  
  // 加载数据
  onMount(async () => {
    try {
      loading = true;
      allQueries = await loadDataFile('/data/example-100.json');
      queryIndex = buildQueryIndex(allQueries);
      loading = false;
      
      // 自动选择第一个query
      if (queryIndex.length > 0) {
        selectQuery(0);
      }
    } catch (e) {
      error = `加载数据失败: ${e.message}`;
      loading = false;
    }
  });
  
  // 选择query
  function selectQuery(idx) {
    selectedQueryIdx = idx;
    selectedCandidateIdx = -1;
    highlightedCandidate = null;
    
    if (idx >= 0 && idx < allQueries.length) {
      processedData = processQueryData(allQueries[idx]);
    } else {
      processedData = null;
    }
  }
  
  // 选择candidate
  function handleCandidateSelect(idx) {
    if (selectedCandidateIdx === idx) {
      // 取消选择
      selectedCandidateIdx = -1;
      highlightedCandidate = null;
    } else {
      selectedCandidateIdx = idx;
      if (processedData && idx >= 0 && idx < processedData.candidates.length) {
        highlightedCandidate = processedData.candidates[idx];
      }
    }
  }
  
  // 处理节点悬停
  function handleNodeHover(event, data) {
    tooltipData = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      content: data
    };
  }
  
  // 处理边悬停
  function handleEdgeHover(event, data) {
    tooltipData = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      content: data
    };
  }
  
  // 处理悬停结束
  function handleHoverEnd() {
    tooltipData = {
      ...tooltipData,
      visible: false
    };
  }
  
  // 响应式更新selectedQueryIdx
  $: if (selectedQueryIdx >= 0) {
    selectQuery(selectedQueryIdx);
  }
</script>

<main>
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>加载数据中...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
    </div>
  {:else}
    <!-- Query表格 -->
    <QueryTable 
      {queryIndex} 
      bind:selectedQueryIdx={selectedQueryIdx}
    />
      
    {#if processedData}
      <div class="visualization-container">
        <!-- 左侧：规则依赖图面板 -->
        <div class="left-panel">
          <DependencyGraphPanel 
            {processedData}
            {highlightedCandidate}
            onNodeHover={handleNodeHover}
            onEdgeHover={handleEdgeHover}
            onHoverEnd={handleHoverEnd}
          />
        </div>
        
        <!-- 右侧：二部图+Candidate信息面板 -->
        <div class="right-panel">
          <BipartitePanel 
            {processedData}
            {selectedCandidateIdx}
            onCandidateSelect={handleCandidateSelect}
          />
        </div>
      </div>
    {:else}
      <div class="no-selection">
        <p>请从上方表格选择一个 Query</p>
      </div>
    {/if}
  {/if}
  
  <!-- Tooltip -->
  <Tooltip 
    visible={tooltipData.visible}
    x={tooltipData.x}
    y={tooltipData.y}
    content={tooltipData.content}
  />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  main {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  
  .visualization-container {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  .left-panel {
    flex: 1;
    min-width: 500px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .right-panel {
    width: 800px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  /* 响应式设计 */
  @media (max-width: 1400px) {
    .visualization-container {
      flex-direction: column;
    }
    
    .left-panel {
      min-width: auto;
      height: 50%;
    }
    
    .right-panel {
      width: 100%;
      height: 50%;
    }
  }
  
  .loading,
  .error,
  .no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #666;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading p,
  .error p,
  .no-selection p {
    margin-top: 20px;
    font-size: 16px;
  }
  
  .error {
    color: #d32f2f;
  }
</style>
