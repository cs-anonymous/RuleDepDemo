<script>
  import { onMount } from 'svelte';
  
  export let queryIndex = [];
  export let selectedQueryIdx = -1;
  export let dataset = 'FB15k-237';
  export let record = 'negative';
  export let onDatasetChange = (val) => {};
  export let onRecordChange = (val) => {};
  
  // 动态加载的配置
  let datasetsConfig = null;
  let availableDatasets = [];
  let availableRecords = [];
  let loadingConfig = true;
  
  // 加载配置文件
  onMount(async () => {
    try {
      const response = await fetch('/datasets-config.json');
      datasetsConfig = await response.json();
      availableDatasets = Object.keys(datasetsConfig.datasets || {}).sort();
      updateRecordsForDataset(dataset);
      loadingConfig = false;
    } catch (e) {
      console.error('加载配置文件失败:', e);
      // 使用默认值
      availableDatasets = ['FB15k-237', 'FB15k', 'KG20C', 'WN18', 'WN18RR', 'YAGO3-10', 'codex-l'];
      availableRecords = ['negative', 'positive0.5'];
      loadingConfig = false;
    }
  });
  
  // 根据dataset更新record选项
  function updateRecordsForDataset(datasetName) {
    if (datasetsConfig && datasetsConfig.datasets[datasetName]) {
      availableRecords = datasetsConfig.datasets[datasetName].records || [];
      // 如果当前record不在新列表中，且列表不为空，则选择第一个
      if (availableRecords.length > 0 && !availableRecords.includes(record)) {
        record = availableRecords[0];
        if (onRecordChange) {
          onRecordChange(record);
        }
      }
    } else {
      availableRecords = [];
    }
  }
  
  function selectQuery(index) {
    selectedQueryIdx = index;
  }
  
  function handleDatasetChange(event) {
    const newDataset = event.target.value;
    dataset = newDataset;
    updateRecordsForDataset(newDataset);
    if (onDatasetChange) {
      onDatasetChange(newDataset);
    }
  }
  
  function handleRecordChange(event) {
    const newRecord = event.target.value;
    record = newRecord;
    if (onRecordChange) {
      onRecordChange(newRecord);
    }
  }
  
  // 当dataset prop变化时，更新record选项
  $: if (datasetsConfig && dataset) {
    updateRecordsForDataset(dataset);
  }
</script>

<div class="query-table-container">
  <div class="header-row">
    <h2>Query 列表</h2>
    <div class="controls">
      <div class="control-group">
        <label for="dataset-select">Dataset:</label>
        <select id="dataset-select" value={dataset} on:change={handleDatasetChange}>
          {#each availableDatasets as ds}
            <option value={ds} selected={ds === dataset}>{ds}</option>
          {/each}
        </select>
      </div>
      <div class="control-group">
        <label for="record-select">Record:</label>
        <select id="record-select" value={record} on:change={handleRecordChange} disabled={loadingConfig || availableRecords.length === 0}>
          {#if loadingConfig}
            <option>加载中...</option>
          {:else if availableRecords.length === 0}
            <option>无可用记录</option>
          {:else}
            {#each availableRecords as r}
              <option value={r} selected={r === record}>{r}</option>
            {/each}
          {/if}
        </select>
      </div>
    </div>
  </div>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Query</th>
          <th>#Nodes</th>
          <th>#Edges</th>
          <th>#Candidates</th>
          <th>GT Rank</th>
        </tr>
      </thead>
      <tbody>
        {#each queryIndex as item, idx}
          <tr 
            class:selected={selectedQueryIdx === idx}
            on:click={() => selectQuery(idx)}
          >
            <td>{idx + 1}</td>
            <td class="query-cell" title={item.query}>{item.query}</td>
            <td>{item.numNodes}</td>
            <td>{item.numEdges}</td>
            <td>{item.numCandidates}</td>
            <td>{item.gtRank >= 0 ? item.gtRank : 'N/A'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .query-table-container {
    padding: 20px;
    background: #f8f9fa;
    border-bottom: 2px solid #dee2e6;
    min-height: 150px;
    max-height: 250px;
  }
  
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    flex-wrap: wrap;
    gap: 15px;
  }
  
  h2 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
  
  .controls {
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .control-group label {
    font-size: 14px;
    font-weight: 500;
    color: #495057;
    white-space: nowrap;
  }
  
  .control-group select {
    padding: 6px 12px;
    font-size: 14px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background: white;
    color: #495057;
    cursor: pointer;
    min-width: 120px;
  }
  
  .control-group select:hover {
    border-color: #adb5bd;
  }
  
  .control-group select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25);
  }
  
  .table-wrapper {
    overflow-x: auto;
    overflow-y: auto;
    max-height: 200px;
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  
  thead {
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 10;
  }
  
  th {
    padding: 12px 8px;
    text-align: left;
    font-weight: 600;
    color: #495057;
    border-bottom: 2px solid #dee2e6;
    background: #f8f9fa;
  }
  
  td {
    padding: 10px 8px;
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
    background-color: #e3f2fd;
    font-weight: 500;
  }
  
  .query-cell {
    max-width: 500px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  th:nth-child(1), td:nth-child(1) {
    width: 50px;
    text-align: center;
  }
  
  th:nth-child(3), td:nth-child(3),
  th:nth-child(4), td:nth-child(4),
  th:nth-child(5), td:nth-child(5),
  th:nth-child(6), td:nth-child(6) {
    width: 100px;
    text-align: center;
  }
</style>
