export type Dimensions = Readonly<{ length: number; width: number; height: number }>;
export type PlanMode = 'minimal' | 'comfort' | 'shopping';
export type RiskSeverity = 'critical' | 'warning' | 'info';

export interface Suitcase extends Dimensions {
  maxWeight: number;
}

export interface PackingItem extends Dimensions {
  id: string;
  name: string;
  category: string;
  weight: number;
  priority: 1 | 2 | 3;
  mustHave: boolean;
  fragile?: boolean;
}

export interface Placement {
  itemId: string;
  x: number;
  y: number;
  z: number;
  dimensions: Dimensions;
}

/** 未装入的根因：预留占满额度属于方案预留限制，物理上装不进属于箱体本身不足。 */
export type UnplacedCause = 'invalid' | 'weight-reserve' | 'volume-reserve' | 'box-limit';

export interface UnplacedItem {
  item: PackingItem;
  reason: string;
  cause: UnplacedCause;
}

/** 单套方案的独立预留比例：0 表示可用满，1 表示全部预留。 */
export interface PlanReserves {
  /** 空间预留比例（占箱体总容积）。 */
  spaceReserve: number;
  /** 重量预留比例（占箱体最大承重）。 */
  weightReserve: number;
}

export type PlanReserveSet = Record<PlanMode, PlanReserves>;

export interface PackingPlan {
  id: PlanMode;
  name: string;
  placements: Placement[];
  unplaced: UnplacedItem[];
  totalWeight: number;
  usedVolume: number;
  capacityRatio: number;
  reserves: PlanReserves;
  /** 扣除空间预留后真正可装的容积（cm³）。 */
  usableVolume: number;
  /** 扣除重量预留后真正可装的承重（kg）。 */
  usableWeight: number;
  reservedVolume: number;
  reservedWeight: number;
  /** 已装容积占扣除预留后可用容积的比例。 */
  usableVolumeRatio: number;
  /** 已装重量占扣除预留后可用承重的比例。 */
  usableWeightRatio: number;
}

export interface Risk {
  id: string;
  severity: RiskSeverity;
  title: string;
  message: string;
  itemId?: string;
}

export interface PackingSnapshot {
  suitcase: Suitcase;
  items: PackingItem[];
  selectedPlan: PlanMode;
  /** 每套方案各自独立的空间/重量预留；旧数据缺失时沿用固定比例迁移。 */
  reserves: PlanReserveSet;
}

export function itemVolume(item: Dimensions): number {
  return item.length * item.width * item.height;
}

export function suitcaseVolume(suitcase: Dimensions): number {
  return suitcase.length * suitcase.width * suitcase.height;
}
