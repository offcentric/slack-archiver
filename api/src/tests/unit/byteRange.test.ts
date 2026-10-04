import {describe, expect, it} from 'vitest';
import {parseByteRange} from '../../helpers/byteRange';

describe('byte ranges', () => {
    it('serves the whole file when no usable range is asked for', () => {
        expect(parseByteRange(undefined, 100)).toEqual({kind: 'full'});
        expect(parseByteRange('bytes=-', 100)).toEqual({kind: 'full'});
        expect(parseByteRange('items=0-5', 100)).toEqual({kind: 'full'});
        expect(parseByteRange('bytes=0-5,10-20', 100)).toEqual({kind: 'full'});
    });

    it('clamps an open-ended or oversized range to the file', () => {
        expect(parseByteRange('bytes=0-', 100)).toEqual({kind: 'partial', range: {start: 0, end: 99}});
        expect(parseByteRange('bytes=50-500', 100)).toEqual({kind: 'partial', range: {start: 50, end: 99}});
        expect(parseByteRange('bytes=10-20', 100)).toEqual({kind: 'partial', range: {start: 10, end: 20}});
    });

    it('reads a suffix range from the end of the file', () => {
        expect(parseByteRange('bytes=-10', 100)).toEqual({kind: 'partial', range: {start: 90, end: 99}});
        expect(parseByteRange('bytes=-500', 100)).toEqual({kind: 'partial', range: {start: 0, end: 99}});
    });

    it('rejects a range that starts past the end', () => {
        expect(parseByteRange('bytes=100-', 100)).toEqual({kind: 'unsatisfiable'});
        expect(parseByteRange('bytes=20-10', 100)).toEqual({kind: 'unsatisfiable'});
        expect(parseByteRange('bytes=-0', 100)).toEqual({kind: 'unsatisfiable'});
    });
});
