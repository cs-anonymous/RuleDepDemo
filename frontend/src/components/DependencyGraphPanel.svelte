<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { createEChartsLayout, updateEChartsLayout, highlightNodesAndEdges, destroyEChartsLayout } from '../lib/graphLayout.js';
  import noUiSlider from 'nouislider';
  import 'nouislider/dist/nouislider.css';
  
  export let processedData = null;
  export let highlightedCandidate = null;
  export let numUnseen = 5;
  export let excludeRedundant = true;
  export let onNodeHover = (event, data) => {};
  export let onEdgeHover = (event, data) => {};
  export let onHoverEnd = () => {};
  export let onNumUnseenChange = (val) => {};
  export let onExcludeRedundantChange = (val) => {};
  
  let chartContainer;
  let layout = null;
  let layoutNodes = [];
  let layoutEdges = [];
  let lastMouseEvent = null;
  
  // 过滤器状态
  let filters = {
    surprisal: { min: 0, max: 1 },
    supp: { min: 0, max: 2000 },
    bodySize: { min: 0, max: 2000 }
  };
  
  let metricRanges = null;
  
  // noUiSlider 引用
  let surprisalSlider = null;
  let suppSlider = null;
  let bodySizeSlider = null;
  let numUnseenSlider = null;
  
  // slider DOM 元素
  let surprisalSliderEl;
  let suppSliderEl;
  let bodySizeSliderEl;
  let numUnseenSliderEl;
  
  // 图表尺寸
  const width = 800;
  const height = 700;
  
  let needsSliderInit = false;
  
  // 当数据变化时重新计算布局
  $: if (processedData) {
    initializeLayout(processedData);
    needsSliderInit = true;
  }
  
  // 当numUnseen变化时更新滑动条
  $: if (numUnseenSlider && numUnseen >= 1 && numUnseen <= 10) {
    numUnseenSlider.set([numUnseen]);
  }
  
  // 当高亮候选变化时更新样式
  $: highlightedNodeIds = (highlightedCandidate && typeof highlightedCandidate === 'object' && 'nodes' in highlightedCandidate && highlightedCandidate.nodes) ? new Set(highlightedCandidate.nodes) : null;
  $: highlightedEdgeIds = (highlightedCandidate && typeof highlightedCandidate === 'object' && 'edges' in highlightedCandidate && highlightedCandidate.edges) ? new Set(highlightedCandidate.edges) : null;
  
  afterUpdate(() => {
    if (needsSliderInit && metricRanges) {
      initSliders();
      needsSliderInit = false;
    }
  });
  
  function initializeLayout(data) {
    // 销毁旧布局
    if (layout) {
      destroyEChartsLayout(layout);
      layout = null;
    }
    
    // 计算指标范围
    const nodeSurprisals = data.nodes.map(n => n.surprisal);
    const nodeSupps = data.nodes.map(n => n.supp);
    const nodeBodySizes = data.nodes.map(n => n.bodySize);
    
    metricRanges = {
      surprisal: {
        min: Math.min(...nodeSurprisals),
        max: Math.max(...nodeSurprisals)
      },
      supp: {
        min: Math.min(...nodeSupps),
        max: Math.max(...nodeSupps)
      },
      bodySize: {
        min: Math.min(...nodeBodySizes),
        max: Math.max(...nodeBodySizes)
      }
    };
    
    // 重置过滤器
    filters = {
      surprisal: { ...metricRanges.surprisal },
      supp: { ...metricRanges.supp },
      bodySize: { ...metricRanges.bodySize }
    };
    
    updateLayout();
  }
  
  function initSliders() {
    if (!metricRanges) return;
    
    // 使用 setTimeout 确保 DOM 已经渲染
    setTimeout(() => {
      // Surprisal slider
      if (surprisalSlider) {
        surprisalSlider.destroy();
        surprisalSlider = null;
      }
      if (surprisalSliderEl && !surprisalSliderEl.noUiSlider) {
        try {
          surprisalSlider = noUiSlider.create(surprisalSliderEl, {
            start: [metricRanges.surprisal.min, metricRanges.surprisal.max],
            connect: true,
            range: {
              'min': metricRanges.surprisal.min,
              'max': metricRanges.surprisal.max
            },
            step: (metricRanges.surprisal.max - metricRanges.surprisal.min) / 1000,
            tooltips: [
              { to: (v) => v.toFixed(3) },
              { to: (v) => v.toFixed(3) }
            ]
          });
          
          surprisalSlider.on('update', (values) => {
            filters.surprisal.min = parseFloat(String(values[0]));
            filters.surprisal.max = parseFloat(String(values[1]));
          });
          
          surprisalSlider.on('change', () => {
            updateLayout();
          });
        } catch (e) {
          console.error('Failed to create surprisal slider:', e);
        }
      }
      
      // Support slider
      if (suppSlider) {
        suppSlider.destroy();
        suppSlider = null;
      }
      if (suppSliderEl && !suppSliderEl.noUiSlider) {
        try {
          suppSlider = noUiSlider.create(suppSliderEl, {
            start: [metricRanges.supp.min, metricRanges.supp.max],
            connect: true,
            range: {
              'min': metricRanges.supp.min,
              'max': metricRanges.supp.max
            },
            step: Math.max(1, Math.floor((metricRanges.supp.max - metricRanges.supp.min) / 1000)),
            tooltips: [
              { to: (v) => Math.round(v) },
              { to: (v) => Math.round(v) }
            ]
          });
          
          suppSlider.on('update', (values) => {
            filters.supp.min = parseFloat(String(values[0]));
            filters.supp.max = parseFloat(String(values[1]));
          });
          
          suppSlider.on('change', () => {
            updateLayout();
          });
        } catch (e) {
          console.error('Failed to create support slider:', e);
        }
      }
      
      // Body Size slider
      if (bodySizeSlider) {
        bodySizeSlider.destroy();
        bodySizeSlider = null;
      }
      if (bodySizeSliderEl && !bodySizeSliderEl.noUiSlider) {
        try {
          bodySizeSlider = noUiSlider.create(bodySizeSliderEl, {
            start: [metricRanges.bodySize.min, metricRanges.bodySize.max],
            connect: true,
            range: {
              'min': metricRanges.bodySize.min,
              'max': metricRanges.bodySize.max
            },
            step: Math.max(1, Math.floor((metricRanges.bodySize.max - metricRanges.bodySize.min) / 1000)),
            tooltips: [
              { to: (v) => Math.round(v) },
              { to: (v) => Math.round(v) }
            ]
          });
          
          bodySizeSlider.on('update', (values) => {
            filters.bodySize.min = parseFloat(String(values[0]));
            filters.bodySize.max = parseFloat(String(values[1]));
          });
          
          bodySizeSlider.on('change', () => {
            updateLayout();
          });
        } catch (e) {
          console.error('Failed to create bodySize slider:', e);
        }
      }
      
      // NUM_UNSEEN slider
      if (numUnseenSlider) {
        numUnseenSlider.destroy();
        numUnseenSlider = null;
      }
      if (numUnseenSliderEl && !numUnseenSliderEl.noUiSlider) {
        try {
          numUnseenSlider = noUiSlider.create(numUnseenSliderEl, {
            start: [numUnseen],
            connect: [true, false],
            range: {
              'min': 1,
              'max': 10
            },
            step: 1,
            tooltips: [
              { to: (v) => Math.round(v) }
            ]
          });
          
          numUnseenSlider.on('change', (values) => {
            const newValue = Math.round(parseFloat(String(values[0])));
            if (onNumUnseenChange) {
              onNumUnseenChange(newValue);
            }
          });
        } catch (e) {
          console.error('Failed to create numUnseen slider:', e);
        }
      }
    }, 0);
  }
  
  function updateLayout() {
    if (!processedData) {
      console.log('updateLayout: no processedData');
      return;
    }
    
    console.log('updateLayout called');
    console.log('processedData.nodes:', processedData.nodes.length);
    console.log('processedData.edges:', processedData.edges.length);
    console.log('filters:', filters);
    
    // 应用过滤器
    const filteredNodes = processedData.nodes.filter(node => {
      return node.surprisal >= filters.surprisal.min && node.surprisal <= filters.surprisal.max &&
             node.supp >= filters.supp.min && node.supp <= filters.supp.max &&
             node.bodySize >= filters.bodySize.min && node.bodySize <= filters.bodySize.max;
    });
    
    console.log('filteredNodes:', filteredNodes.length);
    
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    
    const filteredEdges = processedData.edges.filter(edge => {
      return filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target);
    });
    
    console.log('filteredEdges:', filteredEdges.length);
    
    if (filteredNodes.length === 0) {
      console.warn('No nodes after filtering!');
      layoutNodes = [];
      layoutEdges = [];
      if (layout) {
        updateEChartsLayout(layout, [], [], metricRanges);
      }
      return;
    }
    
    // 创建或更新布局
    try {
      if (!layout && chartContainer) {
        layout = createEChartsLayout(chartContainer, filteredNodes, filteredEdges, width, height, metricRanges);
        
        // 设置事件监听
        const chartDom = layout.chart.getDom();
        chartDom.addEventListener('mousemove', (e) => {
          lastMouseEvent = e;
        });
        
        layout.chart.on('mouseover', (params) => {
          // 使用最后记录的鼠标事件，如果没有则创建一个模拟事件
          const event = lastMouseEvent || { 
            clientX: chartDom.getBoundingClientRect().left + chartDom.offsetWidth / 2,
            clientY: chartDom.getBoundingClientRect().top + chartDom.offsetHeight / 2
          };
          
          if (params.dataType === 'node') {
            if (onNodeHover) {
              onNodeHover(event, {
                type: 'node',
                ...params.data.originalData
              });
            }
          } else if (params.dataType === 'edge') {
            const sourceNode = filteredNodes.find(n => n.id.toString() === params.data.source);
            const targetNode = filteredNodes.find(n => n.id.toString() === params.data.target);
            if (onEdgeHover) {
              onEdgeHover(event, {
                type: 'edge',
                source: params.data.source,
                target: params.data.target,
                sourceRule: sourceNode?.rule || '',
                targetRule: targetNode?.rule || '',
                ...params.data.originalData
              });
            }
          }
        });
        
        layout.chart.on('mouseout', () => {
          if (onHoverEnd) {
            onHoverEnd();
          }
        });
      } else if (layout) {
        updateEChartsLayout(layout, filteredNodes, filteredEdges, metricRanges);
      }
      
      layoutNodes = filteredNodes;
      layoutEdges = filteredEdges;
      
      console.log('Layout created/updated, layoutNodes:', layoutNodes.length);
      
      // 应用高亮（如果有选中）或还原状态（如果没有选中）
      const nodeSet = highlightedNodeIds && highlightedNodeIds.size > 0 ? highlightedNodeIds : null;
      const edgeSet = highlightedEdgeIds && highlightedEdgeIds.size > 0 ? highlightedEdgeIds : null;
      highlightNodesAndEdges(layout, nodeSet, edgeSet);
    } catch (e) {
      console.error('Error creating/updating layout:', e);
    }
  }
  
  // 当高亮候选变化时更新图表
  // 即使highlightedNodeIds和highlightedEdgeIds为null或空Set，也要调用以还原状态
  $: if (layout) {
    const nodeSet = highlightedNodeIds && highlightedNodeIds.size > 0 ? highlightedNodeIds : null;
    const edgeSet = highlightedEdgeIds && highlightedEdgeIds.size > 0 ? highlightedEdgeIds : null;
    highlightNodesAndEdges(layout, nodeSet, edgeSet);
  }
  
  onMount(() => {
    // 确保容器已挂载后再初始化
    if (chartContainer) {
      updateLayout();
    }
    
    // 监听窗口大小变化
    const handleResize = () => {
      if (layout && layout.chart) {
        layout.chart.resize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    if (layout) {
      destroyEChartsLayout(layout);
    }
    if (surprisalSlider) surprisalSlider.destroy();
    if (suppSlider) suppSlider.destroy();
    if (bodySizeSlider) bodySizeSlider.destroy();
    if (numUnseenSlider) numUnseenSlider.destroy();
  });
</script>

<div class="dependency-graph-panel">
  <!-- 过滤面板 -->
  <div class="filter-panel">
    <h3>过滤器</h3>
    <div class="filters">
      <div class="filter-group">
        <label>Surprisal</label>
        <div class="slider-container" bind:this={surprisalSliderEl}></div>
      </div>
      
      <div class="filter-group">
        <label>Support</label>
        <div class="slider-container" bind:this={suppSliderEl}></div>
      </div>
      
      <div class="filter-group">
        <label>Body Size</label>
        <div class="slider-container" bind:this={bodySizeSliderEl}></div>
      </div>
      
      <div class="filter-group">
        <label>NUM_UNSEEN</label>
        <div class="slider-container" bind:this={numUnseenSliderEl}></div>
      </div>
      
      <div class="filter-group checkbox-group">
        <label>
          <input 
            type="checkbox" 
            checked={excludeRedundant}
            on:change={(e) => {
              if (onExcludeRedundantChange) {
                onExcludeRedundantChange(e.target.checked);
              }
            }}
          />
          排除冗余规则&候选
        </label>
      </div>
    </div>
  </div>
  
  <!-- 依赖图 -->
  <div class="graph-container">
    <div bind:this={chartContainer} class="chart-container"></div>
    
    <!-- 图例 -->
    {#if metricRanges}
      <div class="legend">
        <h4>节点颜色编码 Support</h4>
        <div class="legend-gradient">
          <div class="legend-labels">
            <span>{metricRanges.supp.min.toFixed(0)}</span>
            <span>{metricRanges.supp.max.toFixed(0)}</span>
          </div>
          <div class="gradient-bar" style="background: linear-gradient(to right, hsl(200, 70%, 50%), hsl(0, 70%, 50%));"></div>
        </div>
        <div class="legend-info">
          <div class="legend-item">
            <span class="legend-label">节点大小:</span>
            <span>编码 Surprisal (直径² ∝ Surprisal)</span>
          </div>
          <div class="legend-item">
            <span class="legend-label">节点颜色:</span>
            <span>编码 Support (蓝→红)</span>
          </div>
          <div class="legend-item">
            <span class="legend-label">边粗细:</span>
            <span>编码 |Surprisal|</span>
          </div>
          <div class="legend-item">
            <span class="legend-label">边深浅:</span>
            <span>编码 Support (浅→深)</span>
          </div>
          <div class="legend-item">
            <span class="legend-label">负边:</span>
            <span style="color: #0066ff;">蓝色 (Surprisal &lt; 0)</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .dependency-graph-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
  }
  
  .filter-panel {
    padding: 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
  }
  
  .filter-panel h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #333;
  }
  
  .filters {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-group.checkbox-group {
    flex: 0 0 auto;
    min-width: auto;
    display: flex;
    align-items: center;
    padding-top: 15px;
  }
  
  .filter-group label {
    display: block;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 500;
    color: #495057;
  }
  
  .filter-group.checkbox-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 0;
    cursor: pointer;
  }
  
  .filter-group.checkbox-group input[type="checkbox"] {
    cursor: pointer;
  }
  
  .slider-container {
    height: 15px;
    padding: 0px;
    margin: 15px;
  }
  
  /* noUiSlider 自定义样式 */
  :global(.noUi-connect) {
    background: #667eea;
  }
  
  :global(.noUi-horizontal) {
    height: 8px;
  }
  
  :global(.noUi-handle) {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #667eea;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  :global(.noUi-tooltip) {
    font-size: 11px;
    padding: 3px 6px;
    border: none;
    background: rgba(0,0,0,0.8);
    color: white;
  }
  
  .graph-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    position: relative;
  }
  
  .chart-container {
    width: 100%;
    height: 100%;
    min-width: 800px;
    min-height: 700px;
  }
  
  .legend {
    position: absolute;
    top: 20px;
    right: 20px;
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    z-index: 10;
  }
  
  .legend h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
  
  .legend-gradient {
    margin-bottom: 12px;
  }
  
  .legend-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
  }
  
  .gradient-bar {
    height: 20px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  .legend-info {
    font-size: 12px;
    color: #555;
  }
  
  .legend-item {
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .legend-item:last-child {
    margin-bottom: 0;
  }
  
  .legend-label {
    font-weight: 500;
    color: #333;
    min-width: 80px;
  }
</style>
