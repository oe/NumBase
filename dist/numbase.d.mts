interface NumBaseOptions {
    /** Interpret each Unicode code point as one digit. Defaults to UTF-16 code units. */
    unicode?: boolean;
}
interface ConvertOptions {
    sourceRadix?: number;
    targetRadix?: number;
}
interface ConversionTarget {
    encode(value: string, radix?: number): string;
}
export default class NumBase {
    readonly BASE: readonly string[];
    readonly MAX_BASE: number;
    private readonly unicode;
    private readonly digitIndexes;
    private readonly nativeRadixLimit;
    constructor(charList?: string, options?: NumBaseOptions);
    /** Encode an exact integer, rejecting unsafe Numbers and invalid input. */
    encode(number: string | number | bigint, radix?: number): string;
    /** Decode nonempty alphabet digits to an exact decimal string. */
    decode(encoded: string, radix?: number): string;
    /** Convert between alphabets using exact decimal strings and strict validation. */
    convert(value: string, target: ConversionTarget, options?: ConvertOptions): string;
    private validateRadix;
}
export {};
