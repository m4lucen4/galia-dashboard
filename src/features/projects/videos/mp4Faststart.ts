// Walks the top-level ISO BMFF boxes of an MP4 and reports whether `moov`
// appears before `mdat` (faststart). Each step reads at most 16 bytes at the
// start of a box and jumps over its payload, so reads stay tiny and bounded.

const MAX_BOXES = 64;
const HEADER_BYTES = 16;

const readBoxType = (view: DataView): string =>
  String.fromCharCode(
    view.getUint8(4),
    view.getUint8(5),
    view.getUint8(6),
    view.getUint8(7),
  );

/** Returns true only when a top-level moov box is found before mdat. Unparseable files return false. */
export const detectFaststart = async (file: File): Promise<boolean> => {
  try {
    let offset = 0;
    for (let i = 0; i < MAX_BOXES && offset + 8 <= file.size; i += 1) {
      const buffer = await file
        .slice(offset, Math.min(offset + HEADER_BYTES, file.size))
        .arrayBuffer();
      if (buffer.byteLength < 8) return false;
      const view = new DataView(buffer);
      const type = readBoxType(view);

      if (type === "moov") return true;
      if (type === "mdat") return false;

      const size32 = view.getUint32(0);
      let size: number;
      if (size32 === 0) {
        // Box extends to the end of the file and is neither moov nor mdat.
        return false;
      } else if (size32 === 1) {
        if (buffer.byteLength < HEADER_BYTES) return false;
        const size64 = view.getBigUint64(8);
        if (size64 > BigInt(Number.MAX_SAFE_INTEGER)) return false;
        size = Number(size64);
        if (size < HEADER_BYTES) return false;
      } else {
        size = size32;
        if (size < 8) return false;
      }
      offset += size;
    }
    return false;
  } catch {
    return false;
  }
};
