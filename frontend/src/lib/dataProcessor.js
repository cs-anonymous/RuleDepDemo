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

    // 优先尝试整体 JSON 解析（支持数组或单对象）
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === 'object') {
        return [parsed];
      }
    } catch (e) {
      // 回退到按行解析（JSONL）
    }

    // 按行分割并解析每个JSON对象（JSONL 兼容）
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

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function computeCandidateRanks(candidates) {
  const byOriginal = [...candidates].sort((a, b) => toNumber(b.originalSurprisal) - toNumber(a.originalSurprisal));
  const byNew = [...candidates].sort((a, b) => toNumber(b.newSurprisal) - toNumber(a.newSurprisal));

  const rankBeforeMap = new Map();
  const rankAfterMap = new Map();

  byOriginal.forEach((c, idx) => {
    rankBeforeMap.set(c.name, idx + 1);
  });

  byNew.forEach((c, idx) => {
    rankAfterMap.set(c.name, idx + 1);
  });

  return { rankBeforeMap, rankAfterMap };
}

/**
 * 处理单个query数据，构建图结构
 * @param {Object} queryData - 原始query数据
 * @param {number} numUnseen - NUM_UNSEEN参数，默认为5
 * @param {boolean} excludeRedundant - 是否排除冗余规则&候选，默认为false
 * @returns {Object} - 处理后的数据对象
 */
export function processQueryData(queryData, numUnseen = 5, excludeRedundant = false) {
  const {
    query,
    rules: rawRuleIds = [],
    candidates = [],
    ruleInfo = {},
    DepInfo = {},
    depInfo = {}
  } = queryData;

  const depInfoObj = DepInfo || depInfo || {};
  const ruleInfoObj = ruleInfo || {};

  const ruleIds = Array.isArray(rawRuleIds) && rawRuleIds.length > 0
    ? rawRuleIds.map(id => toNumber(id))
    : Object.keys(ruleInfoObj).map(id => toNumber(id));

  // 构建节点，重新计算conf和surprisal
  let nodes = ruleIds.map((ruleId) => {
    const info = ruleInfoObj[ruleId] || ruleInfoObj[String(ruleId)] || {};
    const bodySize = toNumber(info.bodySize);
    const supp = toNumber(info.support ?? info.supp);
    // conf = supp / (bodySize + NUM_UNSEEN)
    const conf = bodySize + numUnseen > 0 ? supp / (bodySize + numUnseen) : 0;
    // surprisal = -ln(1 - conf)
    const surprisal = conf >= 1 ? Infinity : (conf <= 0 ? 0 : -Math.log(1 - conf));
    
    return {
      id: toNumber(ruleId),
      originalId: toNumber(ruleId),
      rule: info.rule || `Rule ${ruleId}`,
      bodySize: bodySize,
      supp: supp,
      conf: conf,
      surprisal: surprisal,
      x: 0,
      y: 0
    };
  });

  // 如果节点数超过500，按surprisal排序并取前500
  const MAX_NODES = 500;
  let selectedNodeIds = new Set();

  if (nodes.length > MAX_NODES) {
    const sortedNodes = [...nodes].sort((a, b) => b.surprisal - a.surprisal);
    nodes = sortedNodes.slice(0, MAX_NODES);
    selectedNodeIds = new Set(nodes.map(n => n.id));
  } else {
    selectedNodeIds = new Set(nodes.map(n => n.id));
  }
  
  // 保存初始的selectedNodeIds，用于后续的排除冗余逻辑
  const initialSelectedNodeIds = new Set(selectedNodeIds);

  // 构建边（DepInfo: {id1: {id2: depMetrics}}）
  const edges = [];
  let edgeId = 0;

  Object.entries(depInfoObj).forEach(([sourceId, targets]) => {
    if (!targets || typeof targets !== 'object') return;
    Object.entries(targets).forEach(([targetId, depMetrics]) => {
      const source = toNumber(sourceId);
      const target = toNumber(targetId);
      const metrics = depMetrics || {};
      const bodySize = toNumber(metrics.bodySize);
      const supp = toNumber(metrics.supp ?? metrics.support);
      const lift = toNumber(metrics.lift ?? 0);
      // conf = supp / (bodySize + NUM_UNSEEN)
      const conf = bodySize + numUnseen > 0 ? supp / (bodySize + numUnseen) : 0;
      // surprisal = -ln(1 - conf)
      const surprisal = conf >= 1 ? Infinity : (conf <= 0 ? 0 : -Math.log(1 - conf));
      
      const edge = {
        id: edgeId++,
        source,
        target,
        bodySize: bodySize,
        supp: supp,
        conf: conf,
        surprisal: surprisal,
        lift: lift
      };
      if (selectedNodeIds.has(source) && selectedNodeIds.has(target)) {
        edges.push(edge);
      }
    });
  });

  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const edgeById = new Map(edges.map(e => [e.id, e]));

  // 排除冗余规则&候选的逻辑
  let filteredCandidates = [...candidates];
  let filteredNodeIds = new Set(initialSelectedNodeIds);
  
  if (excludeRedundant) {
    // 构建ruleId到conf的映射
    const ruleConfMap = new Map();
    nodes.forEach(node => {
      ruleConfMap.set(node.id, node.conf);
    });
    
    // 第一步：找到所有rule中conf最大的值
    let maxConfInAllRules = -1;
    nodes.forEach(node => {
      if (node.conf > maxConfInAllRules) {
        maxConfInAllRules = node.conf;
      }
    });
    
    // 第二步：遍历candidates，如果该candidate的rules长度为1，且该rule的conf不是所有rule中最大的，则删除该candidate
    filteredCandidates = candidates.filter(candidate => {
      const ruleIdList = Array.isArray(candidate.rules) ? candidate.rules.map(id => toNumber(id)) : [];
      const validRuleIds = ruleIdList.filter(id => initialSelectedNodeIds.has(id));
      
      // 如果rules长度为1
      if (validRuleIds.length === 1) {
        const ruleId = validRuleIds[0];
        const ruleConf = ruleConfMap.get(ruleId) || 0;
        
        // 如果该rule的conf不是所有rule中最大的，则删除该candidate
        if (ruleConf < maxConfInAllRules) {
          return false;
        }
      }
      
      return true;
    });
    
    // 第二步：如果发现某个rule没有对应的candidate，则删除对应的rule
    const ruleIdsInCandidates = new Set();
    filteredCandidates.forEach(candidate => {
      const ruleIdList = Array.isArray(candidate.rules) ? candidate.rules.map(id => toNumber(id)) : [];
      ruleIdList.forEach(id => {
        if (initialSelectedNodeIds.has(id)) {
          ruleIdsInCandidates.add(id);
        }
      });
    });
    
    // 更新filteredNodeIds
    filteredNodeIds = new Set([...initialSelectedNodeIds].filter(id => ruleIdsInCandidates.has(id)));
    
    // 更新nodes，只保留有对应candidate的rule
    nodes = nodes.filter(node => filteredNodeIds.has(node.id));
  }

  const { rankBeforeMap, rankAfterMap } = computeCandidateRanks(filteredCandidates);

  const processedCandidates = filteredCandidates
    .map(candidate => {
      const ruleIdList = Array.isArray(candidate.rules) ? candidate.rules.map(id => toNumber(id)) : [];
      const filteredNodes = ruleIdList.filter(id => filteredNodeIds.has(id));
      const filteredNodeSet = new Set(filteredNodes);
      const filteredEdges = edges
        .filter(edge => filteredNodeSet.has(edge.source) && filteredNodeSet.has(edge.target))
        .map(edge => edge.id);

      return {
        ...candidate,
        rankBefore: rankBeforeMap.get(candidate.name) ?? -1,
        rankAfter: rankAfterMap.get(candidate.name) ?? -1,
        nodes: filteredNodes,
        edges: filteredEdges,
        nodeObjects: filteredNodes.map(id => nodeById.get(id)).filter(n => n),
        edgeObjects: filteredEdges.map(id => edgeById.get(id)).filter(e => e)
      };
    })
    .filter(candidate => candidate.nodes.length > 0);

  let gtRank = -1;
  const gtCandidate = processedCandidates.find(c => c.GT === true);
  if (gtCandidate) {
    gtRank = gtCandidate.rankAfter;
  }

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
    const { query, rules = [], candidates = [], DepInfo = {}, depInfo = {} } = queryData;

    const depInfoObj = DepInfo || depInfo || {};
    let edgeCount = 0;
    Object.values(depInfoObj).forEach((targets) => {
      if (targets && typeof targets === 'object') {
        edgeCount += Object.keys(targets).length;
      }
    });

    const { rankAfterMap } = computeCandidateRanks(candidates);
    let gtRank = -1;
    const gtCandidate = candidates.find(c => c.GT === true);
    if (gtCandidate) {
      gtRank = rankAfterMap.get(gtCandidate.name) ?? -1;
    }

    return {
      index,
      query,
      numNodes: Array.isArray(rules) ? rules.length : 0,
      numEdges: edgeCount,
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
