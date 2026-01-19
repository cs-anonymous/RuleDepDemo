<script>
  export let visible = false;
  export let x = 0;
  export let y = 0;
  export let content = {};
  
  // 计算tooltip位置，避免超出屏幕
  $: tooltipX = Math.min(x + 15, window.innerWidth - 300);
  $: tooltipY = Math.min(y + 15, window.innerHeight - 200);
</script>

{#if visible && content}
  <div class="tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
    {#if content.type === 'node'}
      <div class="tooltip-section">
        <strong>规则 #{content.id}</strong>
      </div>
      <div class="tooltip-section rule-text">
        {content.rule}
      </div>
      <div class="tooltip-section metrics">
        <div><span class="label">Body Size:</span> {content.bodySize ?? 'N/A'}</div>
        <div><span class="label">Support:</span> {content.supp ?? 'N/A'}</div>
        <div><span class="label">Conf:</span> {content.conf !== undefined ? content.conf.toFixed(4) : 'N/A'}</div>
        <div><span class="label">Surprisal:</span> {content.surprisal !== undefined ? (isFinite(content.surprisal) ? content.surprisal.toFixed(4) : 'Infinity') : 'N/A'}</div>
      </div>
    {:else if content.type === 'edge'}
      <div class="tooltip-section">
        <strong>边: R{content.source} → R{content.target}</strong>
      </div>
      {#if content.sourceRule || content.targetRule}
        <div class="tooltip-section rule-text">
          {#if content.sourceRule}
            <div>源: {content.sourceRule}</div>
          {/if}
          {#if content.targetRule}
            <div>目标: {content.targetRule}</div>
          {/if}
        </div>
      {/if}
      <div class="tooltip-section metrics">
        <div><span class="label">Body Size:</span> {content.bodySize ?? 'N/A'}</div>
        <div><span class="label">Support:</span> {content.supp ?? 'N/A'}</div>
        <div><span class="label">Conf:</span> {content.conf !== undefined ? content.conf.toFixed(4) : 'N/A'}</div>
        <div><span class="label">Surprisal:</span> {content.surprisal !== undefined ? (isFinite(content.surprisal) ? content.surprisal.toFixed(4) : 'Infinity') : 'N/A'}</div>
        <div><span class="label">Lift:</span> {content.lift !== undefined ? content.lift.toFixed(4) : 'N/A'}</div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .tooltip {
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px;
    border-radius: 6px;
    font-size: 13px;
    max-width: 400px;
    pointer-events: none;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    line-height: 1.4;
  }
  
  .tooltip-section {
    margin-bottom: 8px;
  }
  
  .tooltip-section:last-child {
    margin-bottom: 0;
  }
  
  .rule-text {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #a8dadc;
    word-wrap: break-word;
    max-height: 150px;
    overflow-y: auto;
  }
  
  .metrics {
    font-size: 12px;
  }
  
  .metrics > div {
    margin: 4px 0;
  }
  
  .label {
    color: #ffd60a;
    font-weight: 600;
    margin-right: 4px;
  }
  
  strong {
    color: #06ffa5;
  }
</style>
