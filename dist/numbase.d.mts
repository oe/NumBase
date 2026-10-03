type Radix = number | string | null;
export default class NumBase {
    BASE: string[];
    MAX_BASE: number;
    constructor(charList?: string | null);
    encode(value: string, radix?: Radix): string;
    encode(value: number, radix?: Radix): string | number;
    encode(value: bigint, radix?: Radix): string | bigint;
    encode<T>(value: T, radix?: Radix): string | T;
    decode(value: string, radix?: Radix): string;
    decode<T>(value: T, radix?: Radix): string | T;
}
export {};
