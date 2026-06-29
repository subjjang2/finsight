export type MappingField = "date" | "merchant" | "amount" | "ignore";

export interface ColumnMapping {
  source: string;
  sample: string;
  field: MappingField;
  confidence: number;
}
