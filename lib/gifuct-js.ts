
// This library is embedded directly to ensure the app works offline
// and is not dependent on external CDNs.
// Source: https://github.com/matt-way/gifuct-js

class Parser {
    byteData: Uint8Array;
    pos: number;
    lsd: any;
    gct: any;

    constructor(byteData: Uint8Array){
        this.byteData = byteData;
        this.pos = 0;
    }
    parseHeader(){
        const header: any = {};
        header.signature = this.readString(3);
        header.version = this.readString(3);
        if(header.signature !== 'GIF'){
            throw new Error('Not a GIF file.');
        }
        this.parseLogicalScreenDescriptor();
        if(this.lsd.gctFlag){
            this.gct = this.parseColorTable(this.lsd.gctSize);
        }
        return header;
    }
    parseLogicalScreenDescriptor(){
        this.lsd = {};
        this.lsd.width = this.readUnsigned();
        this.lsd.height = this.readUnsigned();
        const packed = this.readByte();
        this.lsd.gctFlag = (packed & 0x80) !== 0; // 1 bit
        this.lsd.colorResolution = (packed & 0x70) >> 4; // 3 bits
        this.lsd.sortFlag = (packed & 0x08) !== 0; // 1 bit
        this.lsd.gctSize = 2 << (packed & 0x07); // 3 bits
        this.lsd.backgroundColorIndex = this.readByte();
        this.lsd.pixelAspectRatio = this.readByte();
    }
    parseColorTable(size: number){
        const ct = [];
        for (var i = 0; i < size; i++) {
            ct.push(this.readBytes(3));
        }
        return ct;
    }
    readString(count: number){
        let s = '';
        for (var i = 0; i < count; i++) {
            s += String.fromCharCode(this.readByte());
        }
        return s;
    }
    readUnsigned() {
        return this.readByte() | this.readByte() << 8;
    }
    readByte(){
        return this.byteData[this.pos++];
    }
    readBytes(count: number){
        const bytes = [];
        for(let i=0; i<count; i++){
            bytes.push(this.readByte());
        }
        return bytes;
    }
    parseBlock(){
        const block: any = {};
        block.sentinel = this.readByte();
        if(String.fromCharCode(block.sentinel) === "!"){ // EXTENSION BLOCK
            block.type = "ext";
            block.label = this.readByte();
            if(block.label === 0xf9){
                block.type = "gce"; // Graphic Control Extension
                this.parseGCE(block);
            }else if(block.label === 0xfe){
                block.type = "comment";
                this.parseComment(block);
            }else if(block.label === 0xff){
                block.type = "app";
                this.parseApp(block);
            }else if(block.label === 0x01){
                block.type = "pte"; // Plain Text Extension
                this.parsePTE(block);
            }else{
                this.skipSubBlocks();
            }
        }else if(String.fromCharCode(block.sentinel) === ","){ // IMAGE BLOCK
            block.type = "image";
            this.parseImage(block);
        }else if(String.fromCharCode(block.sentinel) === ";"){ // TRAILER BLOCK
            block.type = "trailer";
        }else{
            if (this.pos < this.byteData.length) {
                block.type = "unknown";
            } else {
                 return null; // End of file
            }
        }
        return block;
    }
    parseGCE(block: any){
        block.blockSize = this.readByte(); // Always 4
        const packed = this.readByte();
        block.disposalMethod = (packed & 0x1c) >> 2; // 3 bits
        block.userInputFlag = (packed & 0x02) !== 0; // 1 bit
        block.transparencyFlag = (packed & 0x01) !== 0; // 1 bit
        block.delayTime = this.readUnsigned(); // 2 bytes
        block.transparencyIndex = this.readByte(); // 1 byte
        block.terminator = this.readByte(); // 1 byte (always 0)
    }
    parseComment(block: any){
        block.comment = this.readString(this.readByte());
    }
    parseApp(block: any){
        block.blockSize = this.readByte();
        block.identifier = this.readString(8);
        block.authenticationCode = this.readString(3);
        this.skipSubBlocks();
    }
    parsePTE(block: any){
        this.skipSubBlocks(); // TODO: Implement
    }
    skipSubBlocks(){
        let blockSize;
        while((blockSize = this.readByte()) !== 0x00){
            this.pos += blockSize;
        }
    }
    parseImage(block: any){
        block.descriptor = {};
        block.descriptor.left = this.readUnsigned();
        block.descriptor.top = this.readUnsigned();
        block.descriptor.width = this.readUnsigned();
        block.descriptor.height = this.readUnsigned();
        const packed = this.readByte();
        block.descriptor.lctFlag = (packed & 0x80) !== 0; // 1 bit
        block.descriptor.interlaceFlag = (packed & 0x40) !== 0; // 1 bit
        block.descriptor.sortFlag = (packed & 0x20) !== 0; // 1 bit
        block.descriptor.reserved = (packed & 0x18) >> 3; // 2 bits
        block.descriptor.lctSize = 2 << (packed & 0x07); // 3 bits

        if(block.descriptor.lctFlag){
            block.lct = this.parseColorTable(block.descriptor.lctSize);
        }
        
        block.data = this.parseImageData();
    }
    parseImageData(){
        const imageData: any = {};
        imageData.minCodeSize = this.readByte();
        imageData.blocks = this.readDataBlocks();
        return imageData;
    }
    readDataBlocks(){
        let blocks: number[] = [];
        let blockSize;
        while((blockSize = this.readByte()) !== 0x00){
            blocks.push(...this.readBytes(blockSize));
        }
        return blocks;
    }
}

class LZW {
    minCodeSize: number;
    clearCode: number;
    eofCode: number;
    runningCode: number;
    runningBits: number;
    maxCode: number;
    prevCode: number | null;
    stack: any[];
    table: number[][];

    constructor(minCodeSize: number) {
        this.minCodeSize = minCodeSize;
        this.clearCode = 1 << minCodeSize;
        this.eofCode = this.clearCode + 1;
        this.runningCode = this.eofCode + 1;
        this.runningBits = minCodeSize + 1;
        this.maxCode = 1 << this.runningBits;
        this.prevCode = null;
        this.stack = [];
        this.table = [];
        this.init();
    }
    init() {
        for(let i=0; i < this.clearCode; i++){
            this.table[i] = [i];
        }
    }
    decode(data: number[]) {
        const out: number[] = [];
        let bits = 0;
        let bitsLength = 0;
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];
            bits |= byte << bitsLength;
            bitsLength += 8;
            while(bitsLength >= this.runningBits){
                const code = bits & (this.maxCode - 1);
                bits >>= this.runningBits;
                bitsLength -= this.runningBits;

                if(code === this.clearCode){
                    this.runningBits = this.minCodeSize + 1;
                    this.maxCode = 1 << this.runningBits;
                    this.runningCode = this.eofCode + 1;
                    this.prevCode = null;
                    continue;
                } else if(code === this.eofCode){
                    break; // End of image data
                }

                let chunk;
                if (code >= this.runningCode) {
                    if (this.prevCode === null) {
                        console.error("LZW decode error: prevCode is null on KwKwK case.");
                        break; // Corrupt data
                    }
                    const prevChunk = this.table[this.prevCode];
                    if (!prevChunk) {
                        console.error("LZW decode error: prevChunk not found on KwKwK case.");
                        break; // Corrupt data
                    }
                    chunk = prevChunk.concat(prevChunk[0]);
                } else {
                    chunk = this.table[code];
                }

                if (!chunk) {
                    console.error(`LZW decode error: chunk is undefined for code ${code}.`);
                    break; // Corrupt data
                }

                out.push(...chunk);

                if (this.prevCode !== null) {
                    const prevChunk = this.table[this.prevCode];
                    if (prevChunk) {
                        this.table[this.runningCode++] = prevChunk.concat(chunk[0]);
                    }
                }

                this.prevCode = code;

                if (this.runningCode >= this.maxCode && this.runningBits < 12) {
                    this.runningBits++;
                    this.maxCode = 1 << this.runningBits;
                }
            }
        }
        return out;
    }
}

export const parseGIF = (arrayBuffer: ArrayBuffer) => {
    const byteData = new Uint8Array(arrayBuffer);
    const p = new Parser(byteData);
    const header = p.parseHeader();
    let graphicControlExtension: any;
    const frames = [];
    let block;
    while(block = p.parseBlock()){
        if(block.type === "image"){
            if(graphicControlExtension){
                block.gce = graphicControlExtension;
                graphicControlExtension = null;
            }
            // add frame properties
            block.dims = {
                top: block.descriptor.top,
                left: block.descriptor.left,
                width: block.descriptor.width,
                height: block.descriptor.height
            };
            if(block.gce){
                block.delay = block.gce.delayTime * 10;
                block.disposalType = block.gce.disposalMethod;
            } else {
                block.delay = 0;
                block.disposalType = 1; // Default: Do not dispose
            }

            frames.push(block);
        }else if(block.type === "gce"){
            graphicControlExtension = block;
        }
    }

    return {
        header: header,
        lsd: p.lsd,
        gct: p.gct,
        frames: frames
    }
}

export const decompressFrames = (parsedGif: any, buildPatch: boolean) => {
    const decompressFrame = (frame: any, gct: any, buildPatch: boolean) => {
        if (!frame || !frame.descriptor || !frame.data) {
            console.warn("Skipping invalid frame or frame with no image data.");
            return null;
        }

        const lsd = parsedGif.lsd;
        const od = frame.descriptor.width * frame.descriptor.height;
        const data = new Uint8Array(od * 4);
        const ct = frame.descriptor.lctFlag ? frame.lct : gct;
        const gce = frame.gce;

        const lzw = new LZW(frame.data.minCodeSize);
        const lzwData = lzw.decode(frame.data.blocks);
        
        if (frame.descriptor.interlaceFlag) {
            const interlaceOffsets = [0, 4, 2, 1];
            const interlaceSteps = [8, 8, 4, 2];
            let lineIndex = 0;

            for (let i = 0; i < 4; i++) {
                for (let pixelIndex = interlaceOffsets[i]; pixelIndex < od; pixelIndex += interlaceSteps[i]) {
                    const c = lzwData[lineIndex++];
                    if (gce && c === gce.transparencyIndex) continue;
                    const cl = ct[c];
                    if (!cl) continue;
                    data[(pixelIndex * 4) + 0] = cl[0];
                    data[(pixelIndex * 4) + 1] = cl[1];
                    data[(pixelIndex * 4) + 2] = cl[2];
                    data[(pixelIndex * 4) + 3] = 255;
                }
            }
        } else {
            for (let pixelIndex = 0; pixelIndex < od; pixelIndex++) {
                const c = lzwData[pixelIndex];
                if (gce && c === gce.transparencyIndex) continue;
                const cl = ct[c];
                if (!cl) continue;
                data[(pixelIndex * 4) + 0] = cl[0];
                data[(pixelIndex * 4) + 1] = cl[1];
                data[(pixelIndex * 4) + 2] = cl[2];
                data[(pixelIndex * 4) + 3] = 255;
            }
        }

        frame.patch = data;

        if(buildPatch){
            const totalPixels = lsd.width * lsd.height;
            const patchData = new Uint8ClampedArray(totalPixels * 4);
            patchData.set(data, (frame.descriptor.top * lsd.width * 4) + (frame.descriptor.left * 4));
            frame.patchData = new ImageData(patchData, lsd.width, lsd.height);
        }
        return frame;
    };
    
    return parsedGif.frames
        .map((f: any) => decompressFrame(f, parsedGif.gct, buildPatch))
        .filter((frame: any): frame is any => !!frame);
}
