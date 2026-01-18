/**
 * ECharts 图布局逻辑
 */
import * as echarts from 'echarts';

/**
 * 创建 ECharts 图表实例
 * @param {HTMLElement} container - 容器元素
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 边数组
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {Object} metricRanges - 指标范围（可选）
 * @returns {Object} - ECharts 图表实例
 */
export function createEChartsLayout(container, nodes, edges, width, height, metricRanges = null) {
  const chart = echarts.init(container);
  
  // 如果没有提供 metricRanges，则从数据中计算
  let ranges = metricRanges;
  if (!ranges) {
    const nodeSurprisals = nodes.map(n => n.surprisal);
    const nodeSupps = nodes.map(n => n.supp);
    ranges = {
      surprisal: {
        min: Math.min(...nodeSurprisals),
        max: Math.max(...nodeSurprisals)
      },
      supp: {
        min: Math.min(...nodeSupps),
        max: Math.max(...nodeSupps)
      }
    };
  }
  
  // 转换节点格式为 ECharts 格式
  // 节点大小编码 surprisal（直径的平方正比于 surprisal）
  // 节点颜色编码 supp
  const echartsNodes = nodes.map((node, idx) => ({
    id: node.id.toString(),
    name: node.rule || `Node ${node.id}`,
    value: node.supp,
    category: 0,
    symbolSize: calculateNodeSizeFromSurprisal(
      node.surprisal,
      ranges.surprisal.min,
      ranges.surprisal.max,
      15,
      40
    ),
    itemStyle: {
      color: calculateNodeColorFromSupp(
        node.supp,
        ranges.supp.min,
        ranges.supp.max
      ),
      borderColor: '#333',
      borderWidth: 1,
      opacity: 1
    },
    // 保存原始数据
    originalData: node
  }));
  
  // 转换边格式为 ECharts 格式
  // 边的粗细编码 surprisal 的绝对值
  // 边的深浅编码 support
  // 负边（surprisal < 0）使用蓝色
  const allSurprisals = edges.map(e => Math.abs(e.surprisal));
  const allSupps = edges.map(e => e.supp);
  
  const echartsLinks = edges.map(edge => {
    const isNegative = edge.surprisal < 0;
    const absSurprisal = Math.abs(edge.surprisal);
    
    return {
      source: edge.source.toString(),
      target: edge.target.toString(),
      value: edge.supp || 1,
      lineStyle: {
        width: calculateEdgeWidthFromAbsSurprisal(
          absSurprisal,
          allSurprisals,
          1,
          5
        ),
        opacity: 1,  // 使用固定透明度，深浅通过颜色表示
        color: isNegative ? '#0066ff' : calculateEdgeColorFromSupp(
          edge.supp,
          allSupps
        )
      },
      // 保存原始数据，包括是否为负边
      originalData: {
        ...edge,
        isNegative: isNegative
      }
    };
  });
  
  const option = {
    tooltip: {
      show: false  // 禁用默认 tooltip，使用自定义的
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: echartsNodes,
      links: echartsLinks,
      roam: true,
      label: {
        show: false,
        position: 'right',
        formatter: '{b}'
      },
      labelLayout: {
        hideOverlap: true
      },
      lineStyle: {
        color: 'source',
        curveness: 0.1
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 4
        }
      },
      force: {
        repulsion: 200,
        gravity: 100,
        edgeLength: 150,
        layoutAnimation: true
      }
    }]
  };
  
  // 根据节点数量和容器大小调整布局参数，使节点分布更合理
  // 视角应该随节点数变化，节点越多视角越宽
  const nodeCount = nodes.length;
  const containerSize = Math.min(width, height);
  
  // 计算合适的 repulsion，使节点分布更紧凑
  // 节点越多，repulsion 应该适当增加，但不要太大
  // 使用容器对角线作为参考，确保节点分布充分利用空间
  const containerDiagonal = Math.sqrt(width * width + height * height);
  // 基础 repulsion 基于容器大小（减小系数）
  const baseRepulsion = containerDiagonal * 0.3;
  // 节点数量因子：节点越多，repulsion 适当增加（减小系数）
  const nodeFactor = Math.pow(nodeCount, 0.7) * 8;
  // 调整后的 repulsion，确保有足够的空间（减小范围）
  const adjustedRepulsion = Math.max(200, Math.min(2000, baseRepulsion + nodeFactor));
  
  // 根据节点数量和容器大小调整边的长度
  // 节点越多，边应该适当增加，但不要太大
  const baseEdgeLength = containerDiagonal * 0.15;
  // 节点数量因子：节点越多，边适当增加（减小系数）
  const edgeLengthFactor = Math.pow(nodeCount, 0.3) * 5;
  const adjustedEdgeLength = Math.max(80, Math.min(250, baseEdgeLength + edgeLengthFactor));
  
  // 重力应该很小，避免节点过度聚集在中心
  // 节点越多，重力应该越小
  const adjustedGravity = Math.max(0.01, 0.1 / Math.sqrt(nodeCount || 1));
  
  option.series[0].force = {
    repulsion: adjustedRepulsion,
    gravity: adjustedGravity,  // 根据节点数动态调整重力
    edgeLength: adjustedEdgeLength,
    layoutAnimation: true,
    friction: 0.6  // 添加摩擦力，使布局更稳定
  };
  
  chart.setOption(option);
  
  // 布局参数已经优化，会自动适应窗口大小
  
  return {
    chart,
    nodes: echartsNodes,
    links: echartsLinks
  };
}

/**
 * 更新图表数据
 * @param {Object} layout - ECharts 布局实例
 * @param {Array} nodes - 新节点数组
 * @param {Array} edges - 新边数组
 * @param {Object} metricRanges - 指标范围
 */
export function updateEChartsLayout(layout, nodes, edges, metricRanges) {
  if (!layout || !layout.chart) return;
  
  // 获取容器尺寸
  const chartDom = layout.chart.getDom();
  const width = chartDom.offsetWidth || 800;
  const height = chartDom.offsetHeight || 700;
  
  // 转换节点格式
  // 节点大小编码 surprisal（直径的平方正比于 surprisal）
  // 节点颜色编码 supp
  const echartsNodes = nodes.map(node => ({
    id: node.id.toString(),
    name: node.rule || `Node ${node.id}`,
    value: node.supp,
    category: 0,
    symbolSize: calculateNodeSizeFromSurprisal(
      node.surprisal,
      metricRanges.surprisal.min,
      metricRanges.surprisal.max,
      15,
      40
    ),
    itemStyle: {
      color: calculateNodeColorFromSupp(
        node.supp,
        metricRanges.supp.min,
        metricRanges.supp.max
      ),
      borderColor: '#333',
      borderWidth: 1,
      opacity: 1
    },
    originalData: node
  }));
  
  // 转换边格式
  // 边的粗细编码 surprisal 的绝对值
  // 边的深浅编码 support
  // 负边（surprisal < 0）使用蓝色
  const allSurprisals = edges.map(e => Math.abs(e.surprisal));
  const allSupps = edges.map(e => e.supp);
  
  const echartsLinks = edges.map(edge => {
    const isNegative = edge.surprisal < 0;
    const absSurprisal = Math.abs(edge.surprisal);
    
    return {
      source: edge.source.toString(),
      target: edge.target.toString(),
      value: edge.supp || 1,
      lineStyle: {
        width: calculateEdgeWidthFromAbsSurprisal(
          absSurprisal,
          allSurprisals,
          1,
          5
        ),
        opacity: 1,  // 使用固定透明度，深浅通过颜色表示
        color: isNegative ? '#0066ff' : calculateEdgeColorFromSupp(
          edge.supp,
          allSupps
        )
      },
      // 保存原始数据，包括是否为负边
      originalData: {
        ...edge,
        isNegative: isNegative
      }
    };
  });
  
  // 根据节点数量重新计算布局参数
  const nodeCount = nodes.length;
  const containerSize = Math.min(width, height);
  const containerDiagonal = Math.sqrt(width * width + height * height);
  
  // 计算布局参数（与 createEChartsLayout 中的逻辑一致）
  const baseRepulsion = containerDiagonal * 0.3;
  const nodeFactor = Math.pow(nodeCount, 0.7) * 8;
  const adjustedRepulsion = Math.max(200, Math.min(2000, baseRepulsion + nodeFactor));
  
  const baseEdgeLength = containerDiagonal * 0.15;
  const edgeLengthFactor = Math.pow(nodeCount, 0.3) * 5;
  const adjustedEdgeLength = Math.max(80, Math.min(250, baseEdgeLength + edgeLengthFactor));
  
  const adjustedGravity = Math.max(0.01, 0.1 / Math.sqrt(nodeCount || 1));
  
  layout.chart.setOption({
    series: [{
      data: echartsNodes,
      links: echartsLinks,
      force: {
        repulsion: adjustedRepulsion,
        gravity: adjustedGravity,
        edgeLength: adjustedEdgeLength,
        layoutAnimation: true,
        friction: 0.6
      }
    }]
  }, { notMerge: false });
  
  layout.nodes = echartsNodes;
  layout.links = echartsLinks;
}

/**
 * 高亮节点和边
 * @param {Object} layout - ECharts 布局实例
 * @param {Set} nodeIds - 要高亮的节点ID集合
 * @param {Set} edgeIds - 要高亮的边ID集合
 */
export function highlightNodesAndEdges(layout, nodeIds, edgeIds) {
  if (!layout || !layout.chart) return;
  
  const option = layout.chart.getOption();
  if (!option || !option.series || !option.series[0]) return;
  
  const series = option.series[0];
  
  // 更新节点样式
  const updatedNodes = (series.data || []).map(node => {
    const nodeId = typeof node.id === 'string' ? parseInt(node.id) : node.id;
    const isHighlighted = nodeIds && nodeIds.has(nodeId);
    return {
      ...node,
      itemStyle: {
        ...node.itemStyle,
        borderColor: isHighlighted ? '#ff0000' : '#333',
        borderWidth: isHighlighted ? 3 : 1,
        opacity: nodeIds && !isHighlighted ? 0.3 : 1
      }
    };
  });
  
  // 更新边样式
  const updatedLinks = (series.links || []).map(link => {
    const edgeId = link.originalData?.id;
    const isHighlighted = edgeIds && edgeIds.has(edgeId);
    const isNegative = link.originalData?.isNegative || false;
    
    // 如果是负边，保持蓝色不变
    const edgeColor = isNegative ? '#0066ff' : (isHighlighted ? '#ff0000' : link.lineStyle.color || '#999');
    
    return {
      ...link,
      lineStyle: {
        ...link.lineStyle,
        color: edgeColor,
        opacity: edgeIds && !isHighlighted ? 0.2 : 1,  // 使用固定透明度，深浅通过颜色表示
        width: isHighlighted ? Math.max(link.lineStyle.width || 2, 3) : link.lineStyle.width || 2
      }
    };
  });
  
  layout.chart.setOption({
    series: [{
      data: updatedNodes,
      links: updatedLinks
    }]
  });
}

/**
 * 销毁图表
 * @param {Object} layout - ECharts 布局实例
 */
export function destroyEChartsLayout(layout) {
  if (layout && layout.chart) {
    layout.chart.dispose();
  }
}

/**
 * 计算节点大小（基于surprisal，直径的平方正比于surprisal）
 * @param {number} surprisal - surprisal值
 * @param {number} minSurprisal - 最小surprisal
 * @param {number} maxSurprisal - 最大surprisal
 * @param {number} minSize - 最小节点直径
 * @param {number} maxSize - 最大节点直径
 * @returns {number} - 节点直径
 */
export function calculateNodeSizeFromSurprisal(surprisal, minSurprisal, maxSurprisal, minSize = 15, maxSize = 40) {
  if (maxSurprisal === minSurprisal) return (minSize + maxSize) / 2;
  
  // 归一化 surprisal
  const normalized = (surprisal - minSurprisal) / (maxSurprisal - minSurprisal);
  
  // 直径的平方正比于 surprisal，所以直径正比于 sqrt(surprisal)
  // 但我们使用归一化的值，所以直接使用 sqrt(normalized)
  const normalizedSqrt = Math.sqrt(Math.max(0, Math.min(1, normalized)));
  
  // 计算直径
  const diameter = minSize + normalizedSqrt * (maxSize - minSize);
  return diameter;
}

/**
 * 计算节点颜色（基于supp）
 * @param {number} supp - support值
 * @param {number} minSupp - 最小support
 * @param {number} maxSupp - 最大support
 * @returns {string} - 颜色值
 */
export function calculateNodeColorFromSupp(supp, minSupp, maxSupp) {
  if (maxSupp === minSupp) return 'hsl(200, 70%, 50%)';
  
  const normalized = (supp - minSupp) / (maxSupp - minSupp);
  
  // 使用色相映射：低值为蓝色(200)，高值为红色(0)
  const hue = 200 - normalized * 200;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * 计算边的宽度（基于surprisal的绝对值）
 * @param {number} absSurprisal - surprisal的绝对值
 * @param {Array} allAbsSurprisals - 所有边的surprisal绝对值数组
 * @param {number} minWidth - 最小边宽
 * @param {number} maxWidth - 最大边宽
 * @returns {number} - 边宽度
 */
export function calculateEdgeWidthFromAbsSurprisal(absSurprisal, allAbsSurprisals, minWidth = 1, maxWidth = 5) {
  if (allAbsSurprisals.length === 0) return minWidth;
  
  const minAbsSurprisal = Math.min(...allAbsSurprisals);
  const maxAbsSurprisal = Math.max(...allAbsSurprisals);
  
  if (maxAbsSurprisal === minAbsSurprisal) return (minWidth + maxWidth) / 2;
  
  const normalized = (absSurprisal - minAbsSurprisal) / (maxAbsSurprisal - minAbsSurprisal);
  return minWidth + normalized * (maxWidth - minWidth);
}

/**
 * 计算边的透明度（基于support，深浅表示）
 * @param {number} supp - support值
 * @param {Array} allSupps - 所有边的support数组
 * @param {number} minOpacity - 最小透明度（浅）
 * @param {number} maxOpacity - 最大透明度（深）
 * @returns {number} - 边透明度
 */
export function calculateEdgeOpacityFromSupp(supp, allSupps, minOpacity = 0.3, maxOpacity = 0.8) {
  if (allSupps.length === 0) return minOpacity;
  
  const minSupp = Math.min(...allSupps);
  const maxSupp = Math.max(...allSupps);
  
  if (maxSupp === minSupp) return (minOpacity + maxOpacity) / 2;
  
  const normalized = (supp - minSupp) / (maxSupp - minSupp);
  return minOpacity + normalized * (maxOpacity - minOpacity);
}

/**
 * 计算边的颜色（基于support，用于正边）
 * @param {number} supp - support值
 * @param {Array} allSupps - 所有边的support数组
 * @returns {string} - 边颜色（灰色系，深浅表示support，最深为纯黑色）
 */
export function calculateEdgeColorFromSupp(supp, allSupps) {
  if (allSupps.length === 0) return '#999';
  
  const minSupp = Math.min(...allSupps);
  const maxSupp = Math.max(...allSupps);
  
  if (maxSupp === minSupp) return '#999';
  
  const normalized = (supp - minSupp) / (maxSupp - minSupp);
  // 使用灰度，support越大颜色越深，最深为纯黑色（lightness = 0%）
  // 从浅灰（60%）到纯黑色（0%）
  const lightness = 60 - normalized * 60; // 从60%到0%的灰度
  return `hsl(0, 0%, ${lightness}%)`;
}

