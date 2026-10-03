/** Integer radix conversion with the legacy UTF-16 alphabet convention. */
declare class NumBase {
  constructor(alphabet?: string | null);
  BASE: string[];
  MAX_BASE: number;
  encode(value: string, radix?: number | string | null): string;
  encode(value: number, radix?: number | string | null): string | number;
  encode(value: bigint, radix?: number | string | null): string | bigint;
  encode<T>(value: T, radix?: number | string | null): string | T;
  decode(value: string, radix?: number | string | null): string;
  decode<T>(value: T, radix?: number | string | null): string | T;
}
export default NumBase;
