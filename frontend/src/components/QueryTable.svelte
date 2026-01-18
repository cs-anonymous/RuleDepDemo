<script>
  export let queryIndex = [];
  export let selectedQueryIdx = -1;
  
  function selectQuery(index) {
    selectedQueryIdx = index;
  }
</script>

<div class="query-table-container">
  <h2>Query 列表</h2>
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
  
  h2 {
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #333;
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
