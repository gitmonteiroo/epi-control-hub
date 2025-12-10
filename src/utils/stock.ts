export type StockStatusVariant = "danger" | "warning" | "success";

export interface StockStatus {
  label: string;
  variant: StockStatusVariant;
  color?: string;
}

export function getStockStatus(available: number, min: number): StockStatus {
  if (available === 0) {
    return { label: "Crítico", variant: "danger", color: "text-danger" };
  }
  if (available <= min) {
    return { label: "Baixo", variant: "warning", color: "text-warning" };
  }
  if (available <= min * 1.5) {
    return { label: "Atenção", variant: "warning", color: "text-warning" };
  }
  return { label: "Normal", variant: "success", color: "text-success" };
}

export const CONDITION_LABELS: Record<string, string> = {
  bom: "Bom Estado",
  danificado: "Danificado",
  desgastado: "Desgastado",
  vencido: "Vencido",
};

export function getConditionLabel(condition: string | null): string {
  return CONDITION_LABELS[condition || ""] || condition || "-";
}

export const WITHDRAWAL_REASONS = [
  { value: "uso_trabalho", label: "Uso no Trabalho" },
  { value: "treinamento", label: "Treinamento" },
  { value: "substituicao", label: "Substituição (Dano/Perda)" },
  { value: "manutencao", label: "Manutenção" },
  { value: "primeiro_fornecimento", label: "Primeiro Fornecimento" },
  { value: "outros", label: "Outros" },
];

export const EPI_CONDITIONS = [
  { value: "bom", label: "Bom Estado" },
  { value: "danificado", label: "Danificado" },
  { value: "desgastado", label: "Desgastado" },
  { value: "vencido", label: "Vencido" },
];

export const SIZES = [
  "PP", "P", "M", "G", "GG", "XG", "XXG",
  "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45",
];
