const fs = require('fs');

function BmpDecoder(buffer, output_filename) {
  this.pos = 0;
  this.buffer = buffer;
  this.output_filename = output_filename;
  this.bottom_up = true;
  this.flag = this.buffer.toString("utf-8", 0, this.pos += 2);
  if (this.flag != "BM") throw new Error("Invalid BMP File");
  console.log('output filename', this.output_filename)
  this.parseHeader();
  this.getData();
  this.writeOutput();
}

BmpDecoder.prototype.bitRevAndMask = function (num) {
  const bits = num.toString(2);
  const padded = bits.padStart(8, 0)
  const reversed = padded.split('').reverse().join('');;
  const reversedNumber = parseInt(reversed, 2);
  return reversedNumber ^ 0xFF;
}

BmpDecoder.prototype.parseHeader = function() {
  this.fileSize = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.reserved = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.offset = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.headerSize = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.width = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.height = this.buffer.readInt32LE(this.pos);
  this.pos += 4;
  this.planes = this.buffer.readUInt16LE(this.pos);
  this.pos += 2;
  this.bitPP = this.buffer.readUInt16LE(this.pos);
  this.pos += 2;
  this.compress = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.rawSize = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.hr = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.vr = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.colors = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;
  this.importantColors = this.buffer.readUInt32LE(this.pos);
  this.pos += 4;

  if(this.height < 0) {
    this.height *= -1;
    this.bottom_up = false;
  }
}

BmpDecoder.prototype.getData = function() {
    const bitn = "bit" + this.bitPP;
    this.data = Buffer.from([]);
    this[bitn]();
};

BmpDecoder.prototype.bit1 = function() {
  this.pos = this.offset;
  let row = 600;

  while(row > 0) {
    row--;
    const columnBuffer = Buffer.alloc(100);
    for (let col = 0; col < 100 /* 800 / 8*/; col++) {
      const imageByte = this.buffer.readUInt8(this.pos++);
      // Not needed as long as the columns are read correctly
      //const imageByteReversed = this.bitRevAndMask(imageByte);
      columnBuffer.writeUintBE(imageByte, col, 1);
    }
    this.data = Buffer.concat([columnBuffer, this.data])
  }
  console.log('row', row)
  console.log('pos', this.pos)
};


BmpDecoder.prototype.writeOutput = function () {
  fs.writeFileSync(this.output_filename, this.data)
  console.log('wrote ', this.output_filename);
}

module.exports = function(bmpData, output_filename) {
  const decoder = new BmpDecoder(bmpData, output_filename);
  return decoder;
};

