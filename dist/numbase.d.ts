interface NumBaseOptions {
    /** Interpret each Unicode code point as one digit. Defaults to UTF-16 code units. */
    unicode?: boolean;
}
interface ConvertOptions {
    sourceRadix?: number;
    targetRadix?: number;
}
interface ConversionTarget {
    encodeStrict(value: string, radix?: number): string;
}
type Radix = number | string | null;
declare class NumBase {
    BASE: string[];
    MAX_BASE: number;
    private readonly unicode;
    private validatedAlphabet;
    constructor(charList?: string | null, options?: NumBaseOptions);
    encode(value: string, radix?: Radix): string;
    encode(value: number, radix?: Radix): string | number;
    encode(value: bigint, radix?: Radix): string | bigint;
    encode<T>(value: T, radix?: Radix): string | T;
    decode(value: string, radix?: Radix): string;
    decode<T>(value: T, radix?: Radix): string | T;
    /** Encode exact integer input, rejecting unsafe numbers and invalid configuration. */
    encodeStrict(value: string | number | bigint, radix?: number): string;
    /** Decode nonempty digits with strict radix and alphabet validation. */
    decodeStrict(value: string, radix?: number): string;
    /** Convert between alphabets using exact decimal strings and strict validation. */
    convert(value: string, target: ConversionTarget, options?: ConvertOptions): string;
    private strictRadix;
}


export = NumBase;
