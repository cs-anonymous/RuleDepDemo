/**
 * 数据加载和处理模块
 * 支持从example.json（每行一个query对象）加载数据并建立索引
 */

/**
 * 加载example.json文件
 * 文件格式：每行是一个独立的JSON对象
 * @param {string} filePath - 数据文件路径
 * @returns {Promise<Array>} - 解析后的query对象数组
 */
export async function loadDataFile(filePath) {
  try {
    const response = await fetch(filePath);
    const text = await response.text();
    
    // 按行分割并解析每个JSON对象
    const lines = text.trim().split('\n');
    const queries = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.length > 1) {
        // 移除行末的逗号
        if (line.endsWith(',')) {
          line = line.slice(0, -1);
        }
        try {
          const queryData = JSON.parse(line);
          queries.push(queryData);
        } catch (e) {
          console.error(`解析第 ${i + 1} 行时出错:`, e);
          console.error(`问题行内容: ${line.substring(0, 100)}...`);
        }
      }
    }
    
    return queries;
  } catch (error) {
    console.error('加载数据文件失败:', error);
    throw error;
  }
}

/**
 * 处理单个query数据，构建图结构
 * @param {Object} queryData - 原始query数据
 * @returns {Object} - 处理后的数据对象
 */
export function processQueryData(queryData) {
  const { query, nodes: rawNodes, edges: rawEdges, candidates } = queryData;
  
  // 处理nodes: [rule_string, bodySize, supp, surprisal]
  let nodes = rawNodes.map((nodeData, index) => ({
    id: index,
    originalId: index,  // 保存原始索引
    rule: nodeData[0],
    bodySize: nodeData[1],
    supp: nodeData[2],
    surprisal: nodeData[3],
    // ECharts 布局会自动计算位置
    x: 0,
    y: 0
  }));
  
  // 如果节点数超过500，按surprisal排序并取前500
  const MAX_NODES = 500;
  let selectedNodeIds = new Set();
  
  if (nodes.length > MAX_NODES) {
    // 按surprisal降序排序
    const sortedNodes = [...nodes].sort((a, b) => b.surprisal - a.surprisal);
    nodes = sortedNodes.slice(0, MAX_NODES);
    selectedNodeIds = new Set(nodes.map(n => n.originalId));
  } else {
    selectedNodeIds = new Set(nodes.map(n => n.originalId));
  }
  
  // 处理edges: [sourceIdx, targetIdx, bodySize, supp, surprisal]
  // 只保留两端节点都在选中集合中的边
  const edges = rawEdges
    .map((edgeData, index) => ({
      id: index,
      source: edgeData[0],  // 节点索引
      target: edgeData[1],  // 节点索引
      bodySize: edgeData[2],
      supp: edgeData[3],
      surprisal: edgeData[4]
    }))
    .filter(edge => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target));
  
  // 计算GT的rank
  let gtRank = -1;
  const gtCandidate = candidates.find(c => c.GT === true);
  if (gtCandidate) {
    gtRank = gtCandidate.rankAfter;
  }
  
  // 处理candidates，只保留包含选中节点的candidates
  const processedCandidates = candidates
    .map(candidate => {
      // 过滤nodes，只保留在selectedNodeIds中的
      const filteredNodes = candidate.nodes.filter(idx => selectedNodeIds.has(idx));
      const filteredEdges = candidate.edges.filter(idx => {
        const edge = rawEdges[idx];
        return edge && selectedNodeIds.has(edge[0]) && selectedNodeIds.has(edge[1]);
      });
      
      return {
        ...candidate,
        nodes: filteredNodes,
        edges: filteredEdges,
        nodeObjects: filteredNodes.map(idx => nodes.find(n => n.originalId === idx)).filter(n => n),
        edgeObjects: filteredEdges.map(idx => edges.find(e => e.id === idx)).filter(e => e)
      };
    })
    .filter(candidate => candidate.nodes.length > 0);  // 只保留至少有一个节点的候选
  
  return {
    query,
    nodes,
    edges,
    candidates: processedCandidates,
    stats: {
      numNodes: nodes.length,
      numEdges: edges.length,
      numCandidates: candidates.length,
      gtRank
    }
  };
}

/**
 * 构建query索引表
 * @param {Array} queries - query数组
 * @returns {Array} - 索引表数组
 */
export function buildQueryIndex(queries) {
  return queries.map((queryData, index) => {
    const { query, nodes, edges, candidates } = queryData;
    
    // 找到GT的rank
    let gtRank = -1;
    const gtCandidate = candidates.find(c => c.GT === true);
    if (gtCandidate) {
      gtRank = gtCandidate.rankAfter;
    }
    
    return {
      index,
      query,
      numNodes: nodes.length,
      numEdges: edges.length,
      numCandidates: candidates.length,
      gtRank
    };
  });
}

/**
 * 计算指标的范围（用于过滤器）
 * @param {Object} processedData - 处理后的query数据
 * @returns {Object} - 各指标的min/max值
 */
export function calculateMetricRanges(processedData) {
  const { nodes, edges } = processedData;
  
  const nodeSurprisals = nodes.map(n => n.surprisal);
  const nodeSupps = nodes.map(n => n.supp);
  const nodeBodySizes = nodes.map(n => n.bodySize);
  
  const edgeSurprisals = edges.map(e => e.surprisal);
  const edgeSupps = edges.map(e => e.supp);
  const edgeBodySizes = edges.map(e => e.bodySize);
  
  return {
    node: {
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
    },
    edge: {
      surprisal: {
        min: Math.min(...edgeSurprisals),
        max: Math.max(...edgeSurprisals)
      },
      supp: {
        min: Math.min(...edgeSupps),
        max: Math.max(...edgeSupps)
      },
      bodySize: {
        min: Math.min(...edgeBodySizes),
        max: Math.max(...edgeBodySizes)
      }
    }
  };
}

/**
 * 应用过滤器
 * @param {Object} processedData - 处理后的query数据
 * @param {Object} filters - 过滤器配置
 * @returns {Object} - 过滤后的数据
 */
export function applyFilters(processedData, filters) {
  const { nodes, edges } = processedData;
  const { surprisal, supp, bodySize } = filters;
  
  // 过滤节点
  const filteredNodes = nodes.filter(node => {
    return node.surprisal >= surprisal.min && node.surprisal <= surprisal.max &&
           node.supp >= supp.min && node.supp <= supp.max &&
           node.bodySize >= bodySize.min && node.bodySize <= bodySize.max;
  });
  
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  
  // 过滤边（只保留两端节点都在过滤后节点集中的边）
  const filteredEdges = edges.filter(edge => {
    return filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target);
  });
  
  return {
    ...processedData,
    nodes: filteredNodes,
    edges: filteredEdges
  };
}
